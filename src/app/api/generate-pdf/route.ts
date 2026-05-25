import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import { verifyPaymentToken } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cvText, jobDescription, pdfName, paymentToken } = body;

    // 1. Verify signed payment token — stateless, no DB lookup needed
    if (!paymentToken) {
      return NextResponse.json(
        { error: "Akses Ditolak", message: "Token pembayaran tidak ditemukan." },
        { status: 403 }
      );
    }
    const { valid } = verifyPaymentToken(paymentToken);
    if (!valid) {
      return NextResponse.json(
        {
          error: "Akses Ditolak",
          message: "Token pembayaran tidak valid atau sudah kadaluarsa. Silakan lakukan pembayaran ulang.",
        },
        { status: 403 }
      );
    }

    // 2. Validate required data
    if (!cvText || !jobDescription) {
      return NextResponse.json(
        { error: "Data Tidak Lengkap", message: "Data CV atau Job Description tidak ditemukan." },
        { status: 400 }
      );
    }

    // 3. Setup AI provider
    const geminiKey = process.env.GEMINI_API_KEY;
    const openAIKey = process.env.OPENAI_API_KEY;
    if (!geminiKey && !openAIKey) {
      throw new Error("API Key belum dikonfigurasi di server.");
    }
    const isGemini = !!geminiKey;

    // 4. Build prompts
    const systemPrompt = `Rewrite the CV into professional corporate English or Indonesian (matching the JD). Use the Harvard Resume format (Action Verb + Task + Metric). Return the response in clean HTML.
Follow these formatting instructions:
- Do NOT output markdown code blocks. Output raw HTML text directly.
- Use <h1> for the candidate's full name at the top.
- Use <div class="contact-info"> for email, phone, LinkedIn.
- Use <div class="section"> wrapping each section (Education, Experience, Skills, etc).
- Use <div class="section-header"> for section titles.
- Use <div class="item-header"> and <div class="item-subheader"> for job/edu entries.
- Use <ul><li> for bullet points starting with a strong action verb.
- Do NOT include <html>, <head>, <body> tags. Just output the inner body content.`;

    const userPrompt = `Target Job Description:\n${jobDescription}\n\nCandidate Original CV Text:\n${cvText}`;

    // 5. Call AI
    let rawHtml = "";

    if (isGemini) {
      const genAI = new GoogleGenerativeAI(geminiKey!);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
      rawHtml = result.response.text();
    } else {
      const openai = new OpenAI({ apiKey: openAIKey! });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
      });
      rawHtml = completion.choices[0]?.message?.content || "";
    }

    // Clean markdown wrapping if AI included it
    rawHtml = rawHtml
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/\s*```$/, "")
      .trim();

    // 6. Wrap in full printable Harvard-style HTML
    const safeFileName = (pdfName || "Resume").replace(/\.pdf$/i, "");
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CV ATS Optimized — ${safeFileName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Georgia, serif;
      color: #111;
      background: #fff;
      max-width: 210mm;
      margin: 0 auto;
      padding: 15mm;
      line-height: 1.35;
      font-size: 10pt;
    }
    h1 {
      text-align: center;
      font-size: 16pt;
      text-transform: uppercase;
      margin-bottom: 4px;
      font-weight: bold;
      letter-spacing: 0.5px;
    }
    .contact-info {
      text-align: center;
      font-size: 8.5pt;
      color: #333;
      border-bottom: 1.5px solid #111;
      padding-bottom: 6px;
      margin-bottom: 12px;
    }
    .contact-info a { color: #333; text-decoration: none; }
    .section { margin-bottom: 14px; }
    .section-header {
      font-size: 10.5pt;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 1px solid #111;
      margin-top: 10px;
      margin-bottom: 6px;
      padding-bottom: 1px;
      letter-spacing: 0.5px;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      font-size: 9.5pt;
      margin-bottom: 1px;
    }
    .item-subheader {
      display: flex;
      justify-content: space-between;
      font-style: italic;
      font-size: 9pt;
      margin-bottom: 4px;
      color: #222;
    }
    ul { margin: 0 0 6px 16px; }
    li { margin-bottom: 3px; font-size: 9pt; text-align: justify; }
    p { margin-bottom: 4px; font-size: 9pt; }
    .skills-list { font-size: 9pt; }
    @media print {
      body { margin: 0; padding: 0; max-width: 100%; }
      @page { size: A4; margin: 15mm; }
      .print-bar { display: none; }
      body.has-bar { padding-top: 0 !important; }
    }
    .print-bar {
      position: fixed;
      top: 0; left: 0; right: 0;
      background: #1a1a2e;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 1000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    }
    .print-bar span { color: #fff; font-family: Arial, sans-serif; font-size: 13px; }
    .print-bar span strong { color: #a78bfa; }
    .print-btn {
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      color: white;
      border: none;
      padding: 8px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: bold;
      font-family: Arial, sans-serif;
    }
    .print-btn:hover { opacity: 0.85; }
    body.has-bar { padding-top: 50px; }
  </style>
</head>
<body class="has-bar">
  <div class="print-bar">
    <span>CV Teroptimasi ATS oleh <strong>Sivix</strong> — Siap dicetak!</span>
    <button class="print-btn" onclick="window.print()">⬇ Simpan sebagai PDF</button>
  </div>
  ${rawHtml}
  <script>setTimeout(() => window.print(), 800);</script>
</body>
</html>`;

    return new NextResponse(fullHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("Error in generate-pdf route:", error);
    return NextResponse.json(
      {
        error: "CV Generation Failed",
        message: error?.message || "Gagal membuat CV. Silakan coba lagi.",
      },
      { status: 500 }
    );
  }
}
