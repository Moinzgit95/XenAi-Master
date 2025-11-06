// constants.js
export const LANGUAGE_IDS = {
  python: 71,
  javascript: 63,
  cpp: 54,
  c: 50,
  java: 62,
};

export const LANGUAGE_VERSIONS = {
  python: "py",
  javascript: "js",
  typescript: "ts",
  java: "java",
  cpp: "cpp",
  c: "c",
  csharp: "cs",
  go: "go",
  html: "html",
  css: "css",
  markdown: "md",
  text: "txt"
};

export const BOILERPLATES = {
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