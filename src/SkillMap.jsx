import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import TopicDeepCheck from "./TopicDeepCheck";
import { isDue } from "./sm2";
import "./SkillMap.css";

const ICON = { locked: "🔒", unlocked: "○", mastered: "✓" };
const SELF_ASSESSMENTS = [
  { id: "confident", label: "Confident" },
  { id: "shaky", label: "Shaky" },
  { id: "revision", label: "Needs revision" },
];

export default function SkillMap({ uid, nodes }) {
  const [checkingNodeId, setCheckingNodeId] = useState(null);
  const titleById = Object.fromEntries(nodes.map((n) => [n.id, n.title]));

  async function setSelfAssessment(node, assessment) {
    const next = node.selfAssessment === assessment ? null : assessment; // tap again to clear
    const updates = { selfAssessment: next };
    // Saying "needs revision" yourself is real signal too — bring the
    // review date forward to today instead of waiting for SM-2's schedule.
    if (next === "revision") {
      updates.srsDueDate = new Date().toISOString().slice(0, 10);
    }
    await updateDoc(doc(db, "users", uid, "skillGraph", node.id), updates);
  }

  return (
    <ul className="skill-list">
      {nodes.map((n) => (
        <li key={n.id} className={`skill-node ${n.status}`}>
          <div className="skill-row">
            <span className="skill-icon">{ICON[n.status]}</span>
            <span className="skill-title">{n.title}</span>
            {isDue(n) && <span className="due-badge">Due for review</span>}
          </div>

          {n.status === "locked" && n.prerequisites?.length > 0 && (
            <p className="skill-locked-reason">
              Unlocks after mastering {n.prerequisites.map((id) => titleById[id] || id).join(", ")}
            </p>
          )}

          {n.status !== "locked" && checkingNodeId !== n.id && (
            <>
              <div className="self-assess">
                {SELF_ASSESSMENTS.map((opt) => (
                  <button
                    key={opt.id}
                    className={n.selfAssessment === opt.id ? `chip active-${opt.id}` : "chip"}
                    onClick={() => setSelfAssessment(n, opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button className="deep-check-btn" onClick={() => setCheckingNodeId(n.id)}>
                Take the deep check →
              </button>
            </>
          )}

          {checkingNodeId === n.id && (
            <div className="deep-check-wrap">
              <TopicDeepCheck uid={uid} node={n} onClose={() => setCheckingNodeId(null)} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
