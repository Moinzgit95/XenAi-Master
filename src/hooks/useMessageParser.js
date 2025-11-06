
// hooks/useMessageParser.js
import { useMemo } from 'react';

export const useMessageParser = (message) => {
  return useMemo(() => {
    const parts = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const inlineCodeRegex = /`([^`]+)`/g;
    let lastIndex = 0;
    let match;

    // Handle code blocks first
    while ((match = codeBlockRegex.exec(message)) !== null) {
      const [fullMatch, lang, code] = match;
      const startIndex = match.index;

      if (startIndex > lastIndex) {
        const textBefore = message.substring(lastIndex, startIndex);
        // Parse inline code in the text before
        parts.push(...parseInlineCode(textBefore));
      }

      parts.push({
        type: 'codeblock',
        lang: lang || 'text',
        code: code.trim(),
        id: `codeblock-${parts.length}`
      });

      lastIndex = codeBlockRegex.lastIndex;
    }

    // Handle remaining text after last code block
    if (lastIndex < message.length) {
      const remainingText = message.substring(lastIndex);
      parts.push(...parseInlineCode(remainingText));
    }

    return parts;
  }, [message]);
};

// Helper function for inline code parsing
function parseInlineCode(text) {
  const parts = [];
  const inlineCodeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;

  while ((match = inlineCodeRegex.exec(text)) !== null) {
    const [fullMatch, code] = match;
    const startIndex = match.index;

    if (startIndex > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, startIndex)
      });
    }

    parts.push({
      type: 'inlinecode',
      code: code.trim()
    });

    lastIndex = inlineCodeRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}
