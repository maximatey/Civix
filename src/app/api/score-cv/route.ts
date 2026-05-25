import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import { PDFParse } from "pdf-parse";
import { saveSession } from "@/lib/db";

// Force Node.js runtime since pdf-parse requires Node APIs like fs
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // 1. Check API Key configuration (Gemini Free Tier vs OpenAI Paid Tier)
    const geminiKey = process.env.GEMINI_API_KEY;
    const openAIKey = process.env.OPENAI_API_KEY;
    if (!geminiKey && !openAIKey) {
      console.error("API Key is missing in environment variables.");
      return NextResponse.json(
        {
          error: "Konfigurasi Error",
          message:
            "API Key belum ditambahkan di server (.env.local). Silakan tambahkan GEMINI_API_KEY (Gratis) atau OPENAI_API_KEY untuk melanjutkan.",
        },
        { status: 500 }
      );
    }
    const isGemini = !!geminiKey;

    // 2. Parse Multipart Form Data
    const formData = await req.formData();
    const file = formData.get("cv") as File | null;
    const jobDescription = formData.get("jobDescription") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Permintaan Tidak Valid", message: "File CV PDF tidak ditemukan." },
        { status: 400 }
      );
    }

    if (!jobDescription || !jobDescription.trim()) {
      return NextResponse.json(
        { error: "Permintaan Tidak Valid", message: "Deskripsi Pekerjaan (Target Lowongan) kosong." },
        { status: 400 }
      );
    }

    // 3. Extract Raw Text from PDF Buffer
    let cvText = "";
    try {
      const arrayBuffer = await file.arrayBuffer();
      const u8array = new Uint8Array(arrayBuffer);
      const parser = new PDFParse(u8array);
      const pdfData = await parser.getText();
      cvText = pdfData.text || "";
    } catch (parseError: any) {
      console.error("Error parsing PDF file:", parseError);
      return NextResponse.json(
        {
          error: "Gagal Membaca PDF",
          message:
            "Tidak dapat mengekstrak teks dari PDF. Pastikan file PDF tidak rusak atau terenkripsi.",
          debug: parseError?.message,
        },
        { status: 422 }
      );
    }

    if (!cvText.trim()) {
      return NextResponse.json(
        {
          error: "PDF Kosong",
          message:
            "Teks CV tidak terdeteksi. Pastikan PDF Anda bukan berupa gambar hasil scan (gunakan format teks standar).",
        },
        { status: 422 }
      );
    }

    // 4. Build prompts
    const systemPrompt = `You are a ruthless, corporate Applicant Tracking System (ATS) used by top Indonesian BUMNs and tech unicorns. You read the User's CV and the Target Job Description. You must return a strict JSON response containing:
- 'score': an integer from 0-100 based on keyword match and formatting.
- 'missing_keywords': an array of exactly 3 critical keywords from the JD that are missing in the CV.
- 'roast': A 1-sentence brutally honest, slightly sarcastic critique in Indonesian 'Bahasa Gaul' about why this CV would be rejected by a recruiter.
Output MUST be valid JSON with no markdown formatting.`;

    const userPrompt = `Target Job Description:
${jobDescription}

Candidate CV Text:
${cvText}`;

    // 5. Call AI
    let outputText = "";

    if (isGemini) {
      // Native Gemini SDK — no OpenAI compat layer needed
      const genAI = new GoogleGenerativeAI(geminiKey!);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" },
      });
      const result = await model.generateContent(
        `${systemPrompt}\n\n${userPrompt}`
      );
      outputText = result.response.text();
    } else {
      // OpenAI fallback
      const openai = new OpenAI({ apiKey: openAIKey! });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });
      outputText = completion.choices[0]?.message?.content || "";
    }

    if (!outputText) {
      throw new Error("AI tidak mengembalikan respon teks.");
    }

    // 6. Parse and return JSON
    const parsedResult = JSON.parse(outputText);

    // Safety check on response fields
    const score = typeof parsedResult.score === "number" ? parsedResult.score : 50;
    const missing_keywords = Array.isArray(parsedResult.missing_keywords)
      ? parsedResult.missing_keywords.slice(0, 3)
      : ["Kata Kunci A", "Kata Kunci B", "Kata Kunci C"];
    const roast =
      typeof parsedResult.roast === "string"
        ? parsedResult.roast
        : "CV lu kurang menjual bro, HRD duluan yang ngantuk sebelum kelar baca.";

    // 7. Save session state to database
    const sessionId = crypto.randomUUID();
    saveSession(sessionId, {
      status: "PENDING",
      cvText,
      jobDescription,
      pdfName: file.name,
      score,
      missingKeywords: missing_keywords,
      roast,
    });

    return NextResponse.json({
      sessionId,
      score,
      missingKeywords: missing_keywords,
      roast,
    });
  } catch (error: any) {
    console.error("Error in score-cv API route:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message:
          "Terjadi kesalahan internal saat memproses analisis CV Anda. Silakan coba lagi nanti.",
        debug: error?.message,
      },
      { status: 500 }
    );
  }
}
