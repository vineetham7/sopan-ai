// A small, dependency-free renderer for the handful of markdown constructs
// Gemini actually uses in chat replies: **bold**, `inline code`, ```code
// blocks```, and "* "/"- " bullet lists. Not a full markdown parser — just
// enough to stop literal asterisks and backticks showing up in the AI
// Tutor's messages.

function renderInline(text, keyPrefix) {
  // Order matters: bold (**) must be checked before single-* italics, since
  // "**x**" would otherwise be misread as two adjacent italic markers.
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={`${keyPrefix}-${i}`} className="md-inline-code">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={`${keyPrefix}-${i}`}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export function renderMarkdownLite(text) {
  if (!text) return null;
  const codeBlockSplit = text.split(/```(?:\w*\n)?([\s\S]*?)```/g);
  // Odd indices are code block contents, even indices are regular text.
  const blocks = [];
  codeBlockSplit.forEach((chunk, i) => {
    if (i % 2 === 1) {
      blocks.push({ type: "code", content: chunk.replace(/\n$/, "") });
    } else if (chunk.trim()) {
      blocks.push({ type: "text", content: chunk });
    }
  });

  return blocks.map((block, bi) => {
    if (block.type === "code") {
      return (
        <pre key={`code-${bi}`} className="md-code-block"><code>{block.content}</code></pre>
      );
    }

    const lines = block.content.split("\n").filter((l) => l.trim() !== "");
    const elements = [];
    let listBuffer = [];

    function flushList() {
      if (listBuffer.length === 0) return;
      elements.push(
        <ul key={`ul-${bi}-${elements.length}`} className="md-list">
          {listBuffer.map((item, li) => <li key={li}>{renderInline(item, `li-${bi}-${li}`)}</li>)}
        </ul>
      );
      listBuffer = [];
    }

    lines.forEach((line, li) => {
      const headingMatch = line.match(/^\s*#{1,6}\s+(.*)$/);
      if (headingMatch) {
        flushList();
        elements.push(<p key={`h-${bi}-${li}`} className="md-heading">{renderInline(headingMatch[1], `h-${bi}-${li}`)}</p>);
        return;
      }
      const bulletMatch = line.match(/^\s*[*-]\s+(.*)$/);
      if (bulletMatch) {
        listBuffer.push(bulletMatch[1]);
        return;
      }
      flushList();
      elements.push(<p key={`p-${bi}-${li}`}>{renderInline(line, `p-${bi}-${li}`)}</p>);
    });
    flushList();

    return <div key={`block-${bi}`} className="md-block">{elements}</div>;
  });
}
