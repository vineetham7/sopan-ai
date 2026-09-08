import { useState } from "react";
import { STEPS } from "./tourSteps";
import "./WelcomeTour.css";

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
        <p className="tour-body">{step.intro}</p>
        <ul className="tour-points">
          {step.points.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
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
