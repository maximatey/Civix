import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import puppeteer from "puppeteer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Permintaan Tidak Valid", message: "Session ID wajib dilampirkan." },
        { status: 400 }
      );
    }

    // 1. Verify session exists and is PAID
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session Tidak Ditemukan", message: "Sesi tidak valid." },
        { status: 404 }
      );
    }

    if (session.status !== "PAID") {
      return NextResponse.json(
        {
          error: "Akses Ditolak",
          message:
            "Pembayaran untuk sesi ini belum lunas. Silakan lakukan pembayaran terlebih dahulu.",
        },
        { status: 403 }
      );
    }

    // 2. Setup AI provider
    const geminiKey = process.env.GEMINI_API_KEY;
    const openAIKey = process.env.OPENAI_API_KEY;
    if (!geminiKey && !openAIKey) {
      throw new Error("API Key belum dikonfigurasi di server (.env.local).");
    }
    const isGemini = !!geminiKey;

    // 3. Build prompts
    const systemPrompt = `Rewrite the CV into professional corporate English or Indonesian (matching the JD). Use the Harvard Resume format (Action Verb + Task + Metric). Return the response in clean HTML.
Follow these formatting instructions:
- Do NOT output markdown code blocks (like \`\`\`html). Output raw HTML text directly.
- Ensure the HTML uses standard elements: <h1> for name, contact divs, and divs for experiences.
- Keep the structure semantic: use <div class="section"> for sections, <div class="section-header"> for section titles, and <ul>/<li> for achievements.
- Do NOT include <html> or <body> tags or CSS styles inside the elements. Just output the inner body content (sections, lists, headers).`;

    const userPrompt = `Target Job Description:
${session.jobDescription}

Candidate Original CV Text:
${session.cvText}`;

    // 4. Call AI
    let rawHtml = "";

    if (isGemini) {
      const genAI = new GoogleGenerativeAI(geminiKey!);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      console.log(`Calling Gemini (gemini-2.0-flash-lite) to rewrite CV for session ${sessionId}...`);
      const result = await model.generateContent(
        `${systemPrompt}\n\n${userPrompt}`
      );
      rawHtml = result.response.text();
    } else {
      const openai = new OpenAI({ apiKey: openAIKey! });
      console.log(`Calling OpenAI (gpt-4o-mini) to rewrite CV for session ${sessionId}...`);
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

    // Clean up any markdown wrapping if the AI included it anyway
    if (rawHtml.startsWith("```html")) {
      rawHtml = rawHtml.replace(/^```html/, "").replace(/```$/, "");
    } else if (rawHtml.startsWith("```")) {
      rawHtml = rawHtml.replace(/^```/, "").replace(/```$/, "");
    }
    rawHtml = rawHtml.trim();

    // 5. Wrap HTML in ATS-Compliant Harvard CSS Stylesheet
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CV Hasil Optimasi ATS</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }
    body {
      font-family: 'Times New Roman', Georgia, serif;
      color: #111111;
      margin: 0;
      padding: 0;
      line-height: 1.35;
      font-size: 10pt;
    }
    h1 {
      text-align: center;
      font-size: 16pt;
      text-transform: uppercase;
      margin: 0 0 4px 0;
      font-weight: bold;
      letter-spacing: 0.5px;
    }
    p {
      margin: 0 0 4px 0;
    }
    .contact-info {
      text-align: center;
      font-size: 8.5pt;
      margin-bottom: 12px;
      color: #333333;
      border-bottom: 1.5px solid #111111;
      padding-bottom: 6px;
    }
    .contact-info a {
      color: #333333;
      text-decoration: none;
    }
    .section {
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .section-header {
      font-size: 10.5pt;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 1px solid #111111;
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
      color: #222222;
    }
    ul {
      margin: 0 0 6px 0;
      padding-left: 18px;
    }
    li {
      margin-bottom: 3px;
      font-size: 9pt;
      text-align: justify;
    }
    .skills-list {
      font-size: 9pt;
    }
  </style>
</head>
<body>
  ${rawHtml}
</body>
</html>
`;

    // 6. Generate PDF Buffer using Headless Puppeteer
    console.log("Launching headless Puppeteer browser to compile PDF...");
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "15mm",
        bottom: "15mm",
        left: "15mm",
        right: "15mm",
      },
    });

    await browser.close();
    console.log(`PDF compiled successfully for session ${sessionId}. Sending file stream...`);

    // 7. Return PDF Binary Stream
    return new NextResponse(new Blob([pdfBuffer as any]), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="CV_ATS_${session.pdfName || "Optimized"}"`,
      },
    });
  } catch (error: any) {
    console.error("Error in generate-pdf route:", error);
    return NextResponse.json(
      {
        error: "PDF Generation Failed",
        message: error?.message || "Gagal membuat PDF CV. Silakan coba lagi.",
      },
      { status: 500 }
    );
  }
}
