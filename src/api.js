// api.js
import axios from "axios";

// If you self-host Piston, update baseURL accordingly.
// The public endpoint is emkc.org, but consider rate limits for production.
const API = axios.create({
  baseURL: "https://emkc.org/api/v2/piston",
});

// Map editor language identifiers to Piston language slugs and sensible file extensions
const LANGUAGE_MAP = {
  javascript: { piston: "javascript", ext: "js" },
  javascriptreact: { piston: "javascript", ext: "js" },
  typescript: { piston: "typescript", ext: "ts" },
  typescriptreact: { piston: "typescript", ext: "ts" },
  python: { piston: "python", ext: "py" },
  java: { piston: "java", ext: "java" },
  csharp: { piston: "csharp", ext: "cs" },
  cpp: { piston: "cpp", ext: "cpp" },
  c: { piston: "c", ext: "c" },
  go: { piston: "go", ext: "go" },
};

export const executeCode = async (language, sourceCode) => {
  const map = LANGUAGE_MAP[language];
  if (!map) {
    // Return a shape similar to Piston error to keep UI stable
    throw new Error(
      `Unsupported language for execution: ${language}. Try one of: ${Object.keys(LANGUAGE_MAP).join(", ")}`
    );
  }

  try {
    const response = await API.post("/execute", {
      language: map.piston,
      version: "*",
      files: [
        {
          name: `main.${map.ext}`,
          content: sourceCode,
        },
      ],
    });
    return response.data;
  } catch (err) {
    // Surface a concise error to the UI
    const msg = err?.response?.data?.message || err?.message || "Execution failed";
    console.error("Piston execute error:", err?.response?.data || err);
    throw new Error(msg);
  }
};
