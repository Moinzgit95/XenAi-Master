"use client";

import React, { useMemo } from "react";

/**
 * Minimal TextAnimate component inspired by magicui/text-animate.
 * Props:
 * - animation: currently supports "blurInUp"
 * - by: "character" | "word"
 * - once: boolean (no-op here; animation is CSS-only and runs once by default)
 */
export function TextAnimate({
  children,
  animation = "blurInUp",
  by = "character",
  once = true,
  className = "",
  clip = false,
  stagger = 0.03, // seconds per character/word
  duration = 0.6, // seconds per part animation
  delay = 0, // initial delay before first part
}) {
  const text = typeof children === "string" ? children : String(children);

  const parts = useMemo(() => {
    if (by === "word") return text.split(/(\s+)/);
    return Array.from(text);
  }, [text, by]);

  return (
    <span className={className} aria-label={text} style={{ display: "inline-block" }}>
      {parts.map((part, i) => {
        // Preserve spaces as normal spaces when splitting by word
        const isSpace = part.match(/^\s+$/);
        if (isSpace) {
          return <span key={`s-${i}`}>{part}</span>;
        }
        const itemDelay = `${delay + i * stagger}s`;
        const animClass = animation === "blurInUp" ? "ta-blur-in-up" : "ta-blur-in-up";
        return (
          <span
            key={i}
            className={`inline-block will-change-transform will-change-opacity ${animClass}`}
            style={{
              opacity: 0,
              animationDelay: itemDelay,
              animationDuration: `${duration}s`,
              ...(clip
                ? {
                    background: "inherit",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    color: "transparent",
                  }
                : {}),
            }}
          >
            {part}
          </span>
        );
      })}
    </span>
  );
}

export default TextAnimate;
