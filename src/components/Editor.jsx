"use client";
import { Moon, Sun, Sparkles, Wrench, File, Expand, Shrink, Settings, ChevronDown, ChevronRight, Play, ChevronDown as CaretDown, Github } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import axios from "axios";
import { Box } from "@chakra-ui/react";
import Output from "./Output";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";
import { auth } from "@/config/firebase";
import toast from "react-hot-toast";

// Keep boilerplates in a separate file to improve code organization
const BOILERPLATES = {
  'javascript': "// JavaScript code snippet\nconsole.log('Hello, world!');",
  'python': "# Python code snippet\nprint('Hello, world!')",
  'typescript': "// TypeScript code snippet\nconst message: string = 'Hello, world!';\nconsole.log(message);",
  'java': "// Java code snippet\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hello, world!\");\n  }\n}",
  'csharp': "// C# code snippet\nusing System;\n\npublic class Program\n{\n  public static void Main(string[] args)\n  {\n    Console.WriteLine(\"Hello, world!\");\n  }\n}",
  'cpp': "// C++ code snippet\n#include <iostream>\n\nint main() {\n  std::cout << \"Hello, world!\" << std::endl;\n  return 0;\n}",
  'go': "// Go code snippet\npackage main\n\nimport \"fmt\"\n\nfunc main() {\n  fmt.Println(\"Hello, world!\")\n}",
  'html': "<!DOCTYPE html>\n<html>\n<head>\n<title>My First Webpage</title>\n</head>\n<body>\n\n<h1>Hello World!</h1>\n\n<p>This is my first webpage.</p>\n\n</body>\n</html>",
  'markdown': "# Markdown code snippet\n\n## Heading 2\n\nThis is a paragraph.",
  'text': "Plain Text",
};

// Define a direct mapping of file extensions to language identifiers
const EXTENSION_TO_LANGUAGE = {
  js: 'javascript',
  jsx: 'javascriptreact',
  py: 'python',
  ts: 'typescript',
  tsx: 'typescriptreact',
  java: 'java',
  cs: 'csharp',
  cpp: 'cpp',
  c: 'c',
  go: 'go',
  html: 'html',
  css: 'css',
  json: 'json',
  md: 'markdown',
};

// Object to store cached file contents
const FILE_CACHE = {};

export default function CodeEditor({ file }) {
  // State management
  const [selectedTheme, setSelectedTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState("");
  const [isFixing, setIsFixing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [showGitMenu, setShowGitMenu] = useState(false);
  const [repoNameInput, setRepoNameInput] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  // Docs menu removed; single action button only

  // Refs
  const monaco = useMonaco();
  const timeoutRef = useRef(null);
  const editorRef = useRef();
  const outputRef = useRef(null);
  const settingsRef = useRef(null);
  const isSavingRef = useRef(false);
  const unsubscribeRef = useRef(null);

  // When the component unmounts, unsubscribe from Firestore
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Single docs action: create/overwrite <filename>.docs.md with Markdown report
  const generateMarkdownDocsFile = async () => {
    if (!isEditorReady || !file?.workspaceId) return;
    setIsLoading(true);
    try {
      const res = await axios.post("/api/generate-markdown-docs", {
        code: currentCode,
        language: codeLanguage,
        filename: file?.name || "File",
      });
      const markdown = String(res.data?.markdown || "").trim();
      const parts = (file.name || "untitled").split(".");
      parts.length > 1 && parts.pop();
      const base = parts.join(".") || "file";
      const newName = `${base}.docs.md`;
      const newId = `${file.id}-docs-${base}`; // deterministic id per file
      const filePath = `workspaces/${file.workspaceId}/files`;
      const fileRefNew = doc(db, filePath, newId);
      await setDoc(fileRefNew, {
        content: markdown,
        name: newName,
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        workspaceId: file.workspaceId,
      });
      FILE_CACHE[newId] = markdown;
      toast?.success?.("Markdown documentation saved as separate file");
    } catch (e) {
      console.error("Failed to create markdown docs file:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // When the file changes, update the language and load content
  useEffect(() => {
    if (!file?.name) {
      setCodeLanguage("javascript");
      setCurrentCode("// Select a file to start coding...");
      return;
    }

    // Unsubscribe from previous file listener if any
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Detect language from file extension
    const parts = file.name.split(".");
    if (parts.length > 1) {
      const extension = parts.pop().toLowerCase();
      const detectedLanguage = EXTENSION_TO_LANGUAGE[extension] || extension;
      setCodeLanguage(detectedLanguage);
    } else {
      setCodeLanguage("text");
    }

    // Load file content
    loadFileContent();

  }, [file?.id]); // Only re-run when file ID changes

  // Load file content from either cache or Firestore
  const loadFileContent = useCallback(async () => {
    if (!file?.id || !file?.workspaceId) return;

    try {
      // Check if we have this file in cache first
      if (FILE_CACHE[file.id]) {
        setCurrentCode(FILE_CACHE[file.id]);
      } else {
        // Show loading state or placeholder while fetching
        setCurrentCode("// Loading file content...");
      }

      // Setup the file path
      const filePath = `workspaces/${file.workspaceId}/files`;
      const fileRef = doc(db, filePath, file.id);

      // Get the current document
      const fileSnap = await getDoc(fileRef);

      // Check if file exists and has content
      if (fileSnap.exists()) {
        const fileData = fileSnap.data();

        // If file has content, use it
        if (fileData && fileData.content !== undefined) {
          setCurrentCode(fileData.content);
          FILE_CACHE[file.id] = fileData.content;
        } else {
          // If file exists but has no content, apply boilerplate
          const boilerplate = BOILERPLATES[codeLanguage] || `// No boilerplate available for ${codeLanguage}`;
          setCurrentCode(boilerplate);
          FILE_CACHE[file.id] = boilerplate;

          // Save the boilerplate
          await updateDoc(fileRef, {
            content: boilerplate,
            lastModified: new Date().toISOString()
          });
        }
      } else {
        // If file doesn't exist yet, create it with boilerplate
        const boilerplate = BOILERPLATES[codeLanguage] || `// No boilerplate available for ${codeLanguage}`;
        setCurrentCode(boilerplate);
        FILE_CACHE[file.id] = boilerplate;

        // Create the file with boilerplate
        await setDoc(fileRef, {
          content: boilerplate,
          name: file.name,
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          workspaceId: file.workspaceId
        });
      }

      // Set up realtime listener for this file
      setupFileListener();

    } catch (error) {
      console.error("Error loading file content:", error);
      setCurrentCode("// Error loading file content. Please try again.");
    }
  }, [file, codeLanguage]);

  // Setup Firestore listener for realtime updates
  const setupFileListener = useCallback(() => {
    if (!file?.id || !file?.workspaceId) return;

    const filePath = `workspaces/${file.workspaceId}/files`;
    const fileRef = doc(db, filePath, file.id);

    // Unsubscribe from any existing listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Create new listener
    unsubscribeRef.current = onSnapshot(fileRef, (docSnap) => {
      if (docSnap.exists() && !isSavingRef.current) {
        const data = docSnap.data();
        if (data && data.content !== undefined) {
          // Only update if the content changed and we're not the source of the change
          // This prevents overwriting user's unsaved changes
          if (data.content !== currentCode) {
            FILE_CACHE[file.id] = data.content;
            setCurrentCode(data.content);
          }
        }
      }
    });
  }, [file, currentCode]);

  // Handle editor changes with debounce
  const handleEditorChange = useCallback((value) => {
    // Update local state immediately
    setCurrentCode(value);

    // Update the cache
    if (file?.id) {
      FILE_CACHE[file.id] = value;
    }

    // Debounce saving to Firestore
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveToFirestore(value);
    }, 500);
  }, [file]);

  // Save content to Firestore
  const saveToFirestore = useCallback(async (content) => {
    if (!file?.id || !file?.workspaceId || !isEditorReady) return;

    try {
      isSavingRef.current = true;

      const filePath = `workspaces/${file.workspaceId}/files`;
      const fileRef = doc(db, filePath, file.id);

      await updateDoc(fileRef, {
        content,
        lastModified: new Date().toISOString()
      });

      // Ensure the cache is updated
      FILE_CACHE[file.id] = content;

      // Reset saving flag after a delay
      setTimeout(() => {
        isSavingRef.current = false;
      }, 200);
    } catch (error) {
      console.error("Error saving file:", error);
      isSavingRef.current = false;
    }
  }, [file, isEditorReady]);

  // Editor mount handler
  const onMount = useCallback((editor) => {
    editorRef.current = editor;
    setIsEditorReady(true);
    editor.focus();
  }, []);

  // Generate documentation
  const generateDocs = async () => {
    if (!isEditorReady) return;

    setIsLoading(true);
    try {
      const res = await axios.post("/api/generate-documentation", {
        code: currentCode,
        language: codeLanguage
      });

      const documentation = res.data.documentation;
      const newCode = `${currentCode}\n\n${documentation}`;

      setCurrentCode(newCode);
      FILE_CACHE[file.id] = newCode;

      // Save to Firestore
      saveToFirestore(newCode);
    } catch (error) {
      console.error("Failed to generate documentation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fix syntax errors
  const fixSyntaxErrors = async () => {
    if (!isEditorReady) return;

    setIsFixing(true);
    try {
      const res = await axios.post("/api/get-errors", {
        code: currentCode,
        codeLanguage
      });

      if (res.data.fixedCode) {
        const fixedCode = res.data.fixedCode;
        setCurrentCode(fixedCode);
        FILE_CACHE[file.id] = fixedCode;

        // Save to Firestore
        saveToFirestore(fixedCode);
      }
    } catch (error) {
      console.error("Failed to fix syntax:", error);
    } finally {
      setIsFixing(false);
    }
  };

  // Toggle expanded mode
  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
    // Reflow the editor layout after state update
    setTimeout(() => editorRef.current?.layout(), 100);
  }, []);

  // Close settings panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Listen for toggle output panel event from left side panel button
  useEffect(() => {
    const handleToggleOutput = () => {
      setShowOutput(prev => !prev);
    };
    
    window.addEventListener('toggleOutputPanel', handleToggleOutput);
    return () => window.removeEventListener('toggleOutputPanel', handleToggleOutput);
  }, []);
  
  // Listen for trigger upload event from left side panel button
  useEffect(() => {
    const handleTriggerUpload = (event) => {
      // Find the upload button in the DOM and trigger a click
      const uploadButton = document.querySelector('[title="Upload Files"]');
      if (uploadButton) {
        uploadButton.click();
      }
    };
    
    window.addEventListener('triggerUpload', handleTriggerUpload);
    return () => window.removeEventListener('triggerUpload', handleTriggerUpload);
  }, []);

  // Available themes
  const themes = [
    { name: "Dark", value: "vs-dark" },
    { name: "Light", value: "light" },
    { name: "High Contrast", value: "hc-black" },
  ];

  return (
    <div className={`bg-gray-900 m-2 h-[94%] rounded-xl p-3 ${isExpanded ? "fixed inset-0 z-50 m-0" : "relative"}`}>
      <Box className="relative h-full">
        <div className="flex flex-col h-full">
          <Box className="flex-1 h-full">
            <div className="flex justify-between items-center h-[10%] pr-2">
              {file && (
                <div className="flex items-center bg-gray-900 text-white px-4 max-h-[50px] rounded-md shadow-md border border-gray-700 w-40">
                  <File size={16} className="mr-2 text-green-400" />
                  <span className="text-sm text-gray-300 line-clamp-1">{file.name}</span>
                </div>
              )}
              <div className="ml-auto flex gap-3 items-center">
                <button
                  onClick={toggleExpand}
                  className="flex items-center justify-center p-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all"
                  title={isExpanded ? "Shrink" : "Expand"}
                >
                  {isExpanded ? <Shrink size={18} /> : <Expand size={18} />}
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center justify-center p-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg transition-all"
                  title="Settings"
                >
                  <Settings size={18} />
                </button>
                <button
                  onClick={fixSyntaxErrors}
                  disabled={isFixing}
                  title="Fix Code"
                  className="flex items-center justify-center p-2 rounded-lg bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white shadow-lg transition-all"
                >
                  {isFixing ? (
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  ) : (
                    <Wrench size={18} />
                  )}
                </button>
                <button
                  onClick={generateMarkdownDocsFile}
                  disabled={isLoading}
                  title="Generate Markdown Documentation (.docs.md)"
                  className="flex items-center justify-center p-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg transition-all"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles size={18} />
                  )}
                </button>
                <button
                  onClick={() => { setShowOutput(true); setTimeout(() => outputRef.current?.runCode?.(), 0); }}
                  className="flex items-center justify-center p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg transition-all"
                  title="Run Code"
                >
                  <Play size={18} />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowGitMenu((s) => !s)}
                    className="flex items-center justify-center p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white shadow-lg transition-all mr-2"
                    title="GitHub Options"
                  >
                    <CaretDown size={16} />
                  </button>
                  {showGitMenu && (
                    <div className="absolute right-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-md p-3 z-20">
                      <div className="mb-2">
                        <label className="block text-xs text-gray-400 mb-1">Repo Name (optional)</label>
                        <input
                          value={repoNameInput}
                          onChange={(e) => setRepoNameInput(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-gray-700 text-gray-200 outline-none"
                          placeholder="e.g. School-Project"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-400">Visibility</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsPrivate(false)}
                            className={`px-2 py-1 rounded text-xs border ${!isPrivate ? "bg-blue-600 border-blue-500 text-white" : "bg-gray-700 border-gray-600 text-gray-200"}`}
                          >
                            Public
                          </button>
                          <button
                            onClick={() => setIsPrivate(true)}
                            className={`px-2 py-1 rounded text-xs border ${isPrivate ? "bg-blue-600 border-blue-500 text-white" : "bg-gray-700 border-gray-600 text-gray-200"}`}
                          >
                            Private
                          </button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <button
                          onClick={async () => {
                            if (!file?.workspaceId) return;
                            try {
                              setIsPushing(true);
                              const user = auth.currentUser;
                              const idToken = await user?.getIdToken?.();
                              if (!idToken) {
                                toast.error("Please log in to push project");
                                return;
                              }
                              const res = await axios.post(
                                "/api/github/commit-project",
                                {
                                  workspaceId: file.workspaceId,
                                  repoName: repoNameInput || undefined,
                                  isPrivate,
                                  rootPath: "",
                                  message: `Add workspace ${file.workspaceId} files from XenAi`,
                                },
                                { headers: { Authorization: `Bearer ${idToken}` } }
                              );
                              if (res?.data?.repo?.url) {
                                toast.success(`Project pushed to ${res.data.repo.owner}/${res.data.repo.name}`);
                                setShowGitMenu(false);
                              }
                            } catch (err) {
                              if (err?.response?.status === 401) {
                                toast("Connect your GitHub account", { icon: "🔗" });
                                window.location.href = "/api/github/login";
                              } else {
                                console.error("Push project failed", err);
                                toast.error("Push project failed. Check console for details.");
                              }
                            } finally {
                              setIsPushing(false);
                            }
                          }}
                          className="w-full mt-2 px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm flex items-center justify-center gap-2"
                        >
                          <Github size={16} />
                          <span>Push Project</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={async () => {
                    if (!file?.workspaceId) return;
                    try {
                      setIsPushing(true);
                      const user = auth.currentUser;
                      const idToken = await user?.getIdToken?.();
                      if (!idToken) {
                        toast.error("Please log in to push project");
                        return;
                      }
                      const res = await axios.post(
                        "/api/github/commit-project",
                        {
                          workspaceId: file.workspaceId,
                          repoName: repoNameInput || undefined,
                          isPrivate,
                          rootPath: "",
                          message: `Add workspace ${file.workspaceId} files from XenAi`,
                        },
                        { headers: { Authorization: `Bearer ${idToken}` } }
                      );
                      if (res?.data?.repo?.url) {
                        toast.success(
                          `Project pushed to ${res.data.repo.owner}/${res.data.repo.name}`,
                          { id: "gh-push-project" }
                        );
                      }
                    } catch (err) {
                      if (err?.response?.status === 401) {
                        toast("Connect your GitHub account", { icon: "🔗" });
                        window.location.href = "/api/github/login";
                      } else {
                        console.error("Push project failed", err);
                        toast.error("Push project failed. Check console for details.");
                      }
                    } finally {
                      setIsPushing(false);
                    }
                  }}
                  className="flex items-center gap-2 justify-center px-3 py-2 rounded-lg bg-[#24292e] hover:bg-black text-white shadow-lg transition-all border border-[#30363d]"
                  title="Push Project to GitHub"
                >
                  {isPushing ? (
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Github size={16} />
                      <span className="text-sm font-medium">Push Project</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div
                ref={settingsRef}
                className="absolute top-16 right-10 bg-gray-800 p-4 rounded-md shadow-xl border border-gray-700 z-10"
              >
                <h3 className="text-gray-300 mb-2">Settings</h3>
                <div className="flex flex-col gap-2">
                  <div>
                    <label className="text-gray-400 text-sm">Theme</label>
                    <div className="flex gap-2 mt-1">
                      {themes.map((theme) => (
                        <button
                          key={theme.value}
                          onClick={() => setSelectedTheme(theme.value)}
                          className={`px-2 py-1 rounded-md text-xs ${selectedTheme === theme.value
                              ? "bg-blue-600 text-white"
                              : "bg-gray-700 text-gray-300"
                            }`}
                        >
                          {theme.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Font Size</label>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => setFontSize((prev) => Math.max(10, prev - 1))}
                        className="px-2 py-1 rounded-md bg-gray-700 text-gray-300"
                      >
                        -
                      </button>
                      <span className="text-gray-300">{fontSize}px</span>
                      <button
                        onClick={() => setFontSize((prev) => Math.min(24, prev + 1))}
                        className="px-2 py-1 rounded-md bg-gray-700 text-gray-300"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main content area: left-right split when output is visible */}
            <div className="h-[90%] flex w-full gap-4">
              <div className={`${showOutput ? "flex-1" : "w-full"} h-full`}>
                <Editor
                  height="100%"
                  theme={selectedTheme}
                  language={codeLanguage}
                  value={currentCode}
                  onMount={onMount}
                  onChange={handleEditorChange}
                  options={{
                    fontSize: fontSize,
                    wordWrap: "on",
                    minimap: { enabled: false },
                    bracketPairColorization: true,
                    suggest: { preview: true },
                    inlineSuggest: {
                      enabled: true,
                      showToolbar: "onHover",
                      mode: "subword",
                      suppressSuggestions: false,
                    },
                    quickSuggestions: { other: true, comments: true, strings: true },
                    suggestSelection: "recentlyUsed",
                    autoClosingBrackets: "always",
                    autoClosingQuotes: "always",
                    formatOnPaste: true,
                    formatOnType: true,
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
              {!isExpanded && showOutput && (
                <div className="w-[38%] h-full border-l border-gray-700">
                  <Output ref={outputRef} editorRef={editorRef} language={codeLanguage} />
                </div>
              )}
            </div>
          </Box>
        </div>
      </Box>
    </div>
  );
}