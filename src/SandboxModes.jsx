import { useState } from "react";
import MLSandbox from "./MLSandbox";
import NumberPredictor from "./NumberPredictor";
import DecisionBoundaryPlayground from "./DecisionBoundaryPlayground";
import "./SandboxModes.css";

const INTRO_DISMISSED_KEY = "sopan-sandbox-intro-dismissed";

function SandboxIntro({ onDismiss }) {
  return (
    <div className="sandbox-intro card">
      <p className="sandbox-intro-eyebrow">Before you touch anything</p>
      <h3>Ever wondered how AI tells a cat from a dog?</h3>
      <p>
        You're about to find out by doing it yourself — this trains a real, working model
        in your browser, not a canned demo. No prior ML knowledge needed.
      </p>
      <p>
        The Image Classifier below leans on something called <strong>MobileNet</strong> — don't
        let the name throw you. It's a neural network Google already spent millions of photos
        training to recognize shapes, edges, and textures in general. Think of it as borrowing
        a pair of eyes that already know how to look at things. You're not teaching it to see
        from scratch — you're just teaching the last small step: telling two specific things
        apart, using your own photos.
      </p>
      <p className="sandbox-intro-cta">Pick a mode below and start clicking — each step explains itself as you go.</p>
      <button className="sandbox-intro-dismiss" onClick={onDismiss}>Got it, hide this →</button>
    </div>
  );
}

const MODES = [
  {
    id: "classifier",
    name: "Image Classifier",
    blurb: "Train a real image classifier on your own photos.",
    howTo: "Upload at least 2 photos each of two things (default: cats and dogs) below, then train — the model learns to tell them apart from real MobileNet embeddings.",
    icon: <path d="M4 4h16v16H4zM4 15l4-4 4 4 4-6 4 3" />,
    Component: MLSandbox,
    ready: true,
  },
  {
    id: "predictor",
    name: "Number Predictor",
    blurb: "Real linear regression on (x, y) pairs you type in.",
    howTo: "Type real number pairs below — e.g. hours studied → score — using \"+ Add point\". Add at least 3, hit train, then type a new x to see what the model predicts for y.",
    icon: <path d="M3 21 21 3M4 17l4 4M14 4l6 6" />,
    Component: NumberPredictor,
    ready: true,
  },
  {
    id: "boundary",
    name: "Decision Boundary",
    blurb: "Click to place points, watch the real boundary form.",
    howTo: "Pick a class below (Red or Blue), then click the board to drop points of that class. Switch classes and add more — at least 3 per class — then train to watch the model draw a real boundary between them.",
    icon: <path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18" />,
    Component: DecisionBoundaryPlayground,
    ready: true,
  },
  {
    id: "text",
    name: "Text Classifier",
    blurb: "Label short text snippets, train a bag-of-words model.",
    running: null,
    icon: <path d="M4 6h16M4 12h10M4 18h13" />,
    Component: null,
    ready: false,
  },
  {
    id: "clustering",
    name: "Clustering Explorer",
    blurb: "No labels — drop points, watch k-means group them.",
    running: null,
    icon: <path d="M7 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
    Component: null,
    ready: false,
  },
];

export default function SandboxModes() {
  const [activeId, setActiveId] = useState("classifier");
  const [showIntro, setShowIntro] = useState(() => {
    try { return localStorage.getItem(INTRO_DISMISSED_KEY) !== "true"; } catch { return true; }
  });
  const active = MODES.find((m) => m.id === activeId);
  const others = MODES.filter((m) => m.id !== activeId);
  const Active = active.Component;

  function dismissIntro() {
    setShowIntro(false);
    try { localStorage.setItem(INTRO_DISMISSED_KEY, "true"); } catch { /* private browsing, fine to skip */ }
  }

  return (
    <div className="sandbox-modes">
      <div className="sandbox-modes-main">
        {showIntro && <SandboxIntro onDismiss={dismissIntro} />}
        <div className="sandbox-mode-head">
          <h3>{active.name}</h3>
          <p className="sandbox-mode-howto"><strong>How to use this:</strong> {active.howTo}</p>
        </div>
        {Active ? <Active /> : <div className="card"><p className="state-msg">Not built yet — vote for it and check back.</p></div>}
      </div>

      <div className="sandbox-modes-rail">
        <span className="sandbox-rail-label">Other modes</span>
        <div className="sandbox-rail-scroll">
          {others.map((m) => (
            <button
              key={m.id}
              className={m.ready ? "sandbox-rail-card" : "sandbox-rail-card coming-soon"}
              onClick={() => m.ready && setActiveId(m.id)}
              disabled={!m.ready}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                {m.icon}
              </svg>
              <span className="sandbox-rail-name">{m.name}</span>
              <span className="sandbox-rail-blurb">{m.blurb}</span>
              {!m.ready && <span className="sandbox-rail-badge">Coming soon</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
