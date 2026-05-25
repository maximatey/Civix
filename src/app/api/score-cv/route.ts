import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import { saveSession } from "@/lib/db";

// Force Node.js runtime
export const runtime = "nodejs";
export const maxDuration = 30;

// Helper: extract text from PDF using pdfjs-dist (pure JS, no fs reads)
async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  // Dynamically import the ESM-only pdfjs-dist to avoid top-level import issues
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs" as any);
  const pdfjsLib = pdfjs.default ?? pdfjs;

  // Disable worker (not available in serverless)
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    fullText += pageText + "\n";
  }
  return fullText.trim();
}

export async function POST(req: NextRequest) {
  try {
    // 1. Check API Key configuration
    const geminiKey = process.env.GEMINI_API_KEY;
    const openAIKey = process.env.OPENAI_API_KEY;
    if (!geminiKey && !openAIKey) {
      return NextResponse.json(
        {
          error: "Konfigurasi Error",
          message:
            "API Key belum ditambahkan di server. Silakan tambahkan GEMINI_API_KEY di Vercel Environment Variables.",
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
    if (!jobDescription?.trim()) {
      return NextResponse.json(
        { error: "Permintaan Tidak Valid", message: "Deskripsi Pekerjaan kosong." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Pdf = Buffer.from(arrayBuffer).toString("base64");

    // 3. Build prompts
    const systemPrompt = `You are a ruthless, corporate Applicant Tracking System (ATS) used by top Indonesian BUMNs and tech unicorns. Read the attached CV PDF and the Target Job Description. Return a strict JSON response:
- 'score': integer from 0-100 based on keyword match and formatting.
- 'missing_keywords': array of exactly 3 critical keywords from the JD missing in the CV.
- 'roast': 1-sentence brutally honest, slightly sarcastic critique in Indonesian Bahasa Gaul about why this CV would be rejected.
- 'cvText': the full raw text you extracted from the CV PDF.
Output MUST be valid JSON with no markdown formatting.`;

    const userPrompt = `Target Job Description:\n${jobDescription}`;

    // 4. Call AI
    let outputText = "";
    let cvText = "";

    if (isGemini) {
      // Send PDF directly to Gemini — no pdf-parse needed at all
      const genAI = new GoogleGenerativeAI(geminiKey!);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" },
      });

      const result = await model.generateContent([
        systemPrompt,
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64Pdf,
          },
        },
        userPrompt,
      ]);
      outputText = result.response.text();
    } else {
      // OpenAI fallback — must extract text first (no native PDF support)
      let extractedText = "";
      try {
        extractedText = await extractPdfText(arrayBuffer);
      } catch (e: any) {
        console.error("PDF extraction error:", e);
        return NextResponse.json(
          {
            error: "Gagal Membaca PDF",
            message: "Tidak dapat mengekstrak teks dari PDF.",
            debug: e?.message,
          },
          { status: 422 }
        );
      }

      if (!extractedText.trim()) {
        return NextResponse.json(
          {
            error: "PDF Kosong",
            message: "Teks CV tidak terdeteksi. Gunakan PDF format teks standar, bukan hasil scan.",
          },
          { status: 422 }
        );
      }

      const openai = new OpenAI({ apiKey: openAIKey! });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt.replace("attached CV PDF and the ", "CV text and the "),
          },
          { role: "user", content: `${userPrompt}\n\nCV Text:\n${extractedText}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });
      outputText = completion.choices[0]?.message?.content || "";
      cvText = extractedText;
    }

    if (!outputText) {
      throw new Error("AI tidak mengembalikan respon.");
    }

    // 5. Parse response
    const parsedResult = JSON.parse(outputText);

    const score = typeof parsedResult.score === "number" ? parsedResult.score : 50;
    const missing_keywords = Array.isArray(parsedResult.missing_keywords)
      ? parsedResult.missing_keywords.slice(0, 3)
      : ["Kata Kunci A", "Kata Kunci B", "Kata Kunci C"];
    const roast =
      typeof parsedResult.roast === "string"
        ? parsedResult.roast
        : "CV lu kurang menjual bro, HRD duluan yang ngantuk sebelum kelar baca.";

    // For Gemini path, the model also returns cvText it extracted
    if (isGemini && parsedResult.cvText) {
      cvText = parsedResult.cvText;
    }

    // 6. Save session
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

    return NextResponse.json({ sessionId, score, missingKeywords: missing_keywords, roast });
  } catch (error: any) {
    console.error("Error in score-cv API route:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: "Terjadi kesalahan internal saat memproses analisis CV Anda. Silakan coba lagi nanti.",
        debug: error?.message,
      },
      { status: 500 }
    );
  }
}
