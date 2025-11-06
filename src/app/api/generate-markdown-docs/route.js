import { NextResponse } from "next/server";
const { GoogleGenerativeAI } = require("@google/generative-ai");

export async function POST(request) {
  try {
    const { code, language, filename } = await request.json();
    if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });

    const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are generating documentation only. Never repeat or rewrite the source code.
Output Markdown only with the following structure:
# ${filename || "File"} – API Documentation

## Overview
<1-3 concise paragraphs>

## Public API
- List public function/class signatures only (no bodies).

## Parameters
- For each public API entry, list parameters and short descriptions.

## Returns
- For each entry, state return type/value.

## Raises/Errors
- Possible errors/exceptions.

## Complexity
- Time/space complexity if relevant.

## Side Effects
- IO, mutation, external calls.

## Examples
- Minimal pseudo-signatures or tiny snippets (no bodies).

## Notes
- Caveats and usage notes.

Rules:
- Do NOT include the full source code anywhere.
- Do NOT include fenced blocks with code bodies.
- If no public API is detected, write: "No public API detected" under Public API.
- Language: ${language}

Source code:
${code}`;

    const result = await model.generateContent(prompt);
    let markdown = String(result.response.text() || "").trim();

    markdown = sanitizeMarkdown(markdown);

    return NextResponse.json({ markdown }, { status: 200 });
  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message);
    return NextResponse.json({ error: "Failed to generate markdown docs" }, { status: 500 });
  }
}

function sanitizeMarkdown(md) {
  if (!md) return "";
  let text = md.replace(/```[\s\S]*?```/g, ""); // drop fenced code blocks entirely
  // Remove indented code blocks (four spaces or a tab at start) while preserving single-line signatures
  text = text
    .split("\n")
    .filter(line => {
      const s = line || "";
      // keep obvious signatures
      if (/^\s*(def|class)\s+\w+/.test(s)) return true; // Python signatures
      if (/^\s*(public|private|protected|static|final)?\s*[\w\<\>\[\],\s]+\s+\w+\s*\([^)]*\)\s*;?$/.test(s)) return true; // Java/C-like signatures
      if (/^\s*export\s+(function|class)\s+\w+\s*\([^)]*\)\s*;?$/.test(s)) return true; // JS/TS signatures
      // drop typical code body lines
      if (/^\s{4,}|^\t/.test(s)) return false;
      return true;
    })
    .join("\n");
  return text.trim();
}
