"use client";
import { forwardRef, useImperativeHandle, useState } from "react";
import { executeCode } from "../api";

const Output = forwardRef(({ editorRef, language }, ref) => {
  const [output, setOutput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const clear = () => {
    setOutput(null);
    setIsError(false);
  };

  const runCode = async () => {
    const sourceCode = editorRef.current?.getValue?.();
    if (!sourceCode) return;
    setIsLoading(true);
    try {
      const result = await executeCode(language, sourceCode);

      const out = [
        result?.run?.stdout && `Output:\n${result.run.stdout}`,
        result?.run?.stderr && `Runtime Error:\n${result.run.stderr}`,
      ]
        .filter(Boolean)
        .join("\n");

      setOutput(out ? out.split("\n") : ["No output"]);
      setIsError(!!result?.run?.stderr);
    } catch (error) {
      console.error(error);
      setIsError(true);
      setOutput(["Error while running the code"]);
    } finally {
      setIsLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({ runCode, clear }));

  return (
    <div className="w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700">
        <h3 className="text-gray-300">Output</h3>
        <button
          onClick={clear}
          className="px-3 py-1 text-sm rounded-md bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700"
        >
          Clear
        </button>
      </div>

      <div className={`p-4 overflow-auto flex-1 ${isError ? "bg-red-900 bg-opacity-10" : "bg-gray-900"}`}>
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 border-4 border-t-blue-500 border-r-indigo-500 border-b-purple-500 border-l-teal-500 border-t-transparent rounded-full animate-spin shadow-lg"></div>
              <p className="text-blue-400 animate-pulse">Executing code...</p>
            </div>
          </div>
        ) : output ? (
          <div className={`rounded-lg p-4 ${isError ? "bg-red-900 bg-opacity-20 border border-red-700" : "bg-gray-800 border border-gray-700"}`}>
            {output.map((line, i) => (
              <p
                key={i}
                className={`text-sm whitespace-pre-wrap font-mono ${isError ? "text-red-300" : "text-gray-300"}`}
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {line}
              </p>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4 border border-gray-700 shadow-inner">
              <span className="text-2xl">💻</span>
            </div>
            <p className="text-gray-400">Run your program to see output here</p>
          </div>
        )}
      </div>
    </div>
  );
});

export default Output;
