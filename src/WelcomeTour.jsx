import { useState } from "react";
import "./WelcomeTour.css";

const STEPS = [
  { tab: "Diagnostic", body: "Start here — a real 32-question test finds out what you actually know, topic by topic. No self-reporting a skill level." },
  { tab: "Path", body: "Your skill map: see what's locked, unlocked, or mastered, and when a topic is due for review." },
  { tab: "Practice", body: "Run real Python right in your browser, no install — plus a Spot the Bug game to test yourself." },
  { tab: "Plan", body: "Pick a topic and get a real, cited study plan, with flashcards, a quiz, and an AI tutor you can chat with." },
  { tab: "Insta", body: "Real AI research papers and industry news, with bookmarking and filters — not a fake feed." },
  { tab: "Sandbox", body: "Train a real image classifier on your own photos, and watch the actual math happen, step by step." },
];

const STORAGE_KEY = "sopan-tour-seen";

export default function WelcomeTour({ onDone }) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];

  function finish() {
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch { /* private browsing, fine to skip */ }
    onDone();
  }

  return (
    <div className="tour-overlay">
      <div className="tour-card">
        <div className="tour-eyebrow">Sopan AI · {index + 1} of {STEPS.length}</div>
        <h3 className="tour-tab-name">{step.tab}</h3>
        <p className="tour-body">{step.body}</p>
        <div className="tour-dots">
          {STEPS.map((_, i) => <span key={i} className={i === index ? "dot active" : "dot"} />)}
        </div>
        <div className="tour-actions">
          <button className="tour-skip" onClick={finish}>Skip</button>
          <div className="tour-nav">
            {index > 0 && <button className="tour-back" onClick={() => setIndex(index - 1)}>Back</button>}
            {index + 1 < STEPS.length ? (
              <button className="btn btn-primary" onClick={() => setIndex(index + 1)}>Next</button>
            ) : (
              <button className="btn btn-primary" onClick={finish}>Get started</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
