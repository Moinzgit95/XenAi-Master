import { NextResponse } from "next/server";
const { GoogleGenerativeAI } = require("@google/generative-ai");

export async function POST(request) {
  try {
    const { code, language } = await request.json();
    if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });

    const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are a senior developer who writes clean, well-documented code.
Return the SAME code with concise, inline comments inserted.
- Language: ${language}
- Keep original logic and structure intact.
- Use correct comment style for the language.
- Do NOT include any markdown fences or headings.
- Do NOT add surrounding explanatory text; return only the code with comments.

Source code:
${code}`;

    const result = await model.generateContent(prompt);
    let documented = result.response.text().trim();

    // Remove code fences if the model added any
    documented = documented.replace(/```[\s\S]*?```/g, "").replace(/`{3,}/g, "").trim();

    return NextResponse.json({ documented }, { status: 200 });
  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message);
    return NextResponse.json({ error: "Failed to generate documented code" }, { status: 500 });
  }
}
