/**
 * SimpleMarkdown — lightweight markdown → JSX renderer.
 * Handles: **bold**, *italic*, # headings, - bullets, numbered lists, `code`, ---
 * No external dependencies needed.
 */

import React from "react";

function parseInline(text: string): React.ReactNode[] {
  // Bold (**text** or __text__), Italic (*text* or _text_), inline code
  const parts: React.ReactNode[] = [];
  const re = /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3|`([^`]+)`/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[4]}</em>);
    } else if (match[5]) {
      parts.push(
        <code key={match.index} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 4, padding: "1px 5px", fontSize: "0.82em", fontFamily: "monospace" }}>
          {match[5]}
        </code>
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

interface Props {
  content: string;
  style?: React.CSSProperties;
}

export default function SimpleMarkdown({ content, style }: Props) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let listBuffer: React.ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    if (listType === "ul") {
      elements.push(
        <ul key={`ul-${i}`} style={{ paddingLeft: 20, margin: "6px 0" }}>
          {listBuffer}
        </ul>
      );
    } else {
      elements.push(
        <ol key={`ol-${i}`} style={{ paddingLeft: 20, margin: "6px 0" }}>
          {listBuffer}
        </ol>
      );
    }
    listBuffer = [];
    listType = null;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Heading
    const hMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (hMatch) {
      flushList();
      const level = hMatch[1].length;
      const fs = level === 1 ? "1.1rem" : level === 2 ? "1rem" : "0.95rem";
      elements.push(
        <p key={i} style={{ fontWeight: 700, fontSize: fs, margin: "10px 0 4px" }}>
          {parseInline(hMatch[2])}
        </p>
      );
      i++; continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      flushList();
      elements.push(<hr key={i} style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "10px 0" }} />);
      i++; continue;
    }

    // Unordered list
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)/);
    if (ulMatch) {
      if (listType !== "ul") { flushList(); listType = "ul"; }
      listBuffer.push(<li key={i} style={{ margin: "3px 0" }}>{parseInline(ulMatch[1])}</li>);
      i++; continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      if (listType !== "ol") { flushList(); listType = "ol"; }
      listBuffer.push(<li key={i} style={{ margin: "3px 0" }}>{parseInline(olMatch[1])}</li>);
      i++; continue;
    }

    // Empty line = paragraph break
    if (trimmed === "") {
      flushList();
      elements.push(<br key={`br-${i}`} />);
      i++; continue;
    }

    // Regular paragraph line
    flushList();
    elements.push(
      <p key={i} style={{ margin: "2px 0", lineHeight: 1.7 }}>
        {parseInline(trimmed)}
      </p>
    );
    i++;
  }

  flushList();

  return (
    <div style={{ fontSize: "0.88rem", color: "var(--color-lexai-text)", ...style }}>
      {elements}
    </div>
  );
}
