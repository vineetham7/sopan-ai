import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const explainAnswer = httpsCallable(functions, "explainAnswer");

// Hand-authored and Gemini-generated questions come with a real explanation
// already. Real benchmark questions (MMLU/AGIEval) don't — this generates
// one on demand instead of showing a dead "no explanation provided" line.
export default function AnswerExplanation({ prompt, options, answer, source, explanation }) {
  const [generated, setGenerated] = useState(null); // null | "loading" | string

  useEffect(() => {
    if (explanation) return;
    let cancelled = false;
    setGenerated("loading");
    explainAnswer({ prompt, options, answer, source })
      .then((res) => {
        if (!cancelled) setGenerated(res.data.explanation);
      })
      .catch(() => {
        if (!cancelled) setGenerated(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, answer]);

  if (explanation) return <p className="explanation">{explanation}</p>;
  if (generated === "loading") return <p className="explanation muted">Generating an explanation...</p>;
  if (generated) return <p className="explanation">{generated}</p>;
  return (
    <p className="explanation muted">
      This is a real exam question{source ? ` from ${source}` : ""} — no explanation available right now.
    </p>
  );
}
