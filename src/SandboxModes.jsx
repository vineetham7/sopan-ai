import { useState } from "react";
import MLSandbox from "./MLSandbox";
import NumberPredictor from "./NumberPredictor";
import DecisionBoundaryPlayground from "./DecisionBoundaryPlayground";
import "./SandboxModes.css";

const MODES = [
  {
    id: "classifier",
    name: "Image Classifier",
    blurb: "Train a real image classifier on your own photos.",
    running: "Training a small classifier on top of MobileNet's real 1,024-number embeddings.",
    icon: <path d="M4 4h16v16H4zM4 15l4-4 4 4 4-6 4 3" />,
    Component: MLSandbox,
    ready: true,
  },
  {
    id: "predictor",
    name: "Number Predictor",
    blurb: "Real linear regression on (x, y) pairs you type in.",
    running: "A single-neuron linear regression, trained live on your points.",
    icon: <path d="M3 21 21 3M4 17l4 4M14 4l6 6" />,
    Component: NumberPredictor,
    ready: true,
  },
  {
    id: "boundary",
    name: "Decision Boundary",
    blurb: "Click to place points, watch the real boundary form.",
    running: "A small 2-layer classifier, re-evaluated across a real grid every training run.",
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
  const active = MODES.find((m) => m.id === activeId);
  const others = MODES.filter((m) => m.id !== activeId);
  const Active = active.Component;

  return (
    <div className="sandbox-modes">
      <div className="sandbox-modes-main">
        <div className="sandbox-mode-head">
          <h3>{active.name}</h3>
          <p>{active.running}</p>
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
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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
