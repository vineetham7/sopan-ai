import katex from "katex";

// Real benchmark questions (AGIEval's SAT-math set especially) contain
// literal LaTeX in their text — "$$m=\frac{...}{...}$$" — which nothing in
// the app rendered, so it showed up as raw broken-looking syntax instead of
// a formula. Splits on $$...$$ and $...$ delimiters, renders the math
// segments with KaTeX, leaves everything else as plain text.
function splitMath(text) {
  const parts = [];
  const re = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
  let last = 0;
  let match;
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push({ math: false, text: text.slice(last, match.index) });
    const expr = match[1] ?? match[2];
    parts.push({ math: true, text: expr, display: match[1] != null });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ math: false, text: text.slice(last) });
  return parts;
}

export default function MathText({ text }) {
  if (!text || !text.includes("$")) return text;
  const parts = splitMath(text);
  if (parts.length === 1 && !parts[0].math) return text;

  return (
    <>
      {parts.map((p, i) => {
        if (!p.math) return <span key={i}>{p.text}</span>;
        try {
          const html = katex.renderToString(p.text, { throwOnError: false, displayMode: p.display });
          return <span key={i} className="math-text" dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <span key={i}>{p.text}</span>;
        }
      })}
    </>
  );
}
