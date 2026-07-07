/**
 * RichPostContent — renders post content with code block syntax highlighting.
 *
 * Parses fenced code blocks (``` lang\ncode\n```) and renders them with
 * CSS-based token coloring and a copy-to-clipboard button. Plain text
 * paragraphs are rendered normally.
 */
import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language: string;
}

/** Very lightweight CSS-class token highlighter — no external dependency */
function tokenize(code: string, _lang: string): string {
  // Escape HTML first
  let escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Order matters — more specific patterns first
  escaped = escaped
    // Strings (single, double, template literals)
    .replace(
      /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g,
      '<span class="code-string">$1$2$1</span>',
    )
    // Single-line comments
    .replace(/(\/\/[^\n]*)/g, '<span class="code-comment">$1</span>')
    // Multi-line comments
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="code-comment">$1</span>')
    // Keywords
    .replace(
      /\b(const|let|var|function|return|if|else|for|while|class|extends|import|export|from|default|async|await|try|catch|throw|new|typeof|instanceof|void|null|undefined|true|false|this|super|static|type|interface|enum|implements|in|of|break|continue|switch|case|do|delete|yield)\b/g,
      '<span class="code-keyword">$1</span>',
    )
    // Numbers
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="code-number">$1</span>')
    // Function calls
    .replace(/\b([a-zA-Z_$][\w$]*)\s*(?=\()/g, '<span class="code-function">$1</span>');

  return escaped;
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const highlighted = tokenize(code, language);

  return (
    <div className="code-block-wrapper" style={{ position: "relative", margin: "12px 0" }}>
      <div
        className="code-block-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          background: "var(--bg-surface-2, #1e1e2e)",
          borderTopLeftRadius: "8px",
          borderTopRightRadius: "8px",
          borderBottom: "1px solid var(--border, rgba(255,255,255,0.08))",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-muted, #888)",
          }}
        >
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          title="Copy code"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 8px",
            fontSize: "11px",
            cursor: "pointer",
            borderRadius: "4px",
            border: "1px solid var(--border, rgba(255,255,255,0.1))",
            background: "transparent",
            color: copied ? "var(--brand, #6366f1)" : "var(--text-muted, #888)",
            transition: "all 0.2s",
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: "14px 16px",
          overflowX: "auto",
          background: "var(--bg-surface, #13131f)",
          borderBottomLeftRadius: "8px",
          borderBottomRightRadius: "8px",
          border: "1px solid var(--border, rgba(255,255,255,0.08))",
          borderTop: "none",
          fontSize: "13px",
          lineHeight: "1.6",
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
        }}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}

/**
 * Segment type — either plain text or a parsed code block.
 */
type Segment =
  | { type: "text"; content: string }
  | { type: "code"; language: string; code: string };

/**
 * Parses a markdown-style string into alternating text/code segments.
 * Supports ``` lang\n ... ``` and ``` ... ``` patterns.
 */
function parseContent(content: string): Segment[] {
  const segments: Segment[] = [];
  const fenceRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(content)) !== null) {
    // Text before this code block
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "code", language: match[1] || "text", code: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last block
  if (lastIndex < content.length) {
    segments.push({ type: "text", content: content.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", content }];
}

interface RichPostContentProps {
  content: string;
  maxLines?: number;
}

/**
 * Renders post content with fenced code blocks highlighted and a copy button.
 * Plain text paragraphs are split on double-newlines.
 */
export function RichPostContent({ content, maxLines }: RichPostContentProps) {
  const segments = parseContent(content);
  const hasCode = segments.some((s) => s.type === "code");

  return (
    <div className="rich-post-content">
      <style>{`
        .code-keyword { color: #c792ea; font-weight: 600; }
        .code-string  { color: #c3e88d; }
        .code-comment { color: #546e7a; font-style: italic; }
        .code-number  { color: #f78c6c; }
        .code-function { color: #82aaff; }
      `}</style>
      {segments.map((segment, i) => {
        if (segment.type === "code") {
          return <CodeBlock key={i} code={segment.code} language={segment.language} />;
        }
        // Plain text — split on paragraph breaks
        const paragraphs = segment.content.split(/\n\n+/).filter(Boolean);
        return (
          <div key={i}>
            {paragraphs.map((para, j) => (
              <p
                key={j}
                className={`text-sm leading-6 text-secondary ${!hasCode && maxLines ? `line-clamp-${maxLines}` : ""}`}
                style={{ marginBottom: j < paragraphs.length - 1 ? "8px" : 0, whiteSpace: "pre-wrap" }}
              >
                {para}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}
