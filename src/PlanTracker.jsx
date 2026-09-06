import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { toggleStep, deletePlan, recordQuizScore } from "./planStore";
import FlashcardDeck from "./FlashcardDeck";
import PlanQuiz from "./PlanQuiz";
import StepTutorChat from "./StepTutorChat";
import "./PlanTracker.css";

export default function PlanTracker({ uid }) {
  const [plans, setPlans] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [sections, setSections] = useState({}); // planId -> 'steps' | 'flashcards' | 'quiz'
  const [openSteps, setOpenSteps] = useState({}); // "planId:stepId" -> bool
  const [chatMounted, setChatMounted] = useState({}); // "planId:stepId" -> bool, once true stays true
  const [chatOpen, setChatOpen] = useState({}); // "planId:stepId" -> bool, toggled by open/close

  function sectionFor(planId) {
    return sections[planId] || "steps";
  }
  function setSectionFor(planId, section) {
    setSections((prev) => ({ ...prev, [planId]: section }));
  }
  function toggleStepOpen(key) {
    setOpenSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  }
  function openStepChat(key) {
    setChatMounted((prev) => ({ ...prev, [key]: true }));
    setChatOpen((prev) => ({ ...prev, [key]: true }));
  }
  function closeStepChat(key) {
    setChatOpen((prev) => ({ ...prev, [key]: false }));
  }

  useEffect(() => {
    return onSnapshot(collection(db, "users", uid, "plans"), (snap) => {
      setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [uid]);

  if (plans.length === 0) {
    return (
      <div className="plan-tracker empty">
        <p className="state-msg">No saved plans yet — build one in the Plan tab and save it here to track it.</p>
      </div>
    );
  }

  return (
    <div className="plan-tracker">
      {plans.map((plan) => {
        const doneCount = plan.steps.filter((s) => s.checked).length;
        const isOpen = openId === plan.id;
        return (
          <div key={plan.id} className="tracked-plan">
            <button className="tracked-plan-head" onClick={() => setOpenId(isOpen ? null : plan.id)}>
              <span className="tp-title">{plan.title}</span>
              <span className="tp-progress">{doneCount}/{plan.steps.length}</span>
            </button>
            {isOpen && (
              <div className="tracked-plan-body">
                <div className="tp-tabs">
                  <button className={sectionFor(plan.id) === "steps" ? "active" : ""} onClick={() => setSectionFor(plan.id, "steps")}>
                    Steps
                  </button>
                  <button
                    className={sectionFor(plan.id) === "flashcards" ? "active" : ""}
                    onClick={() => setSectionFor(plan.id, "flashcards")}
                    disabled={!plan.flashcards?.length}
                  >
                    Flashcards
                  </button>
                  <button
                    className={sectionFor(plan.id) === "quiz" ? "active" : ""}
                    onClick={() => setSectionFor(plan.id, "quiz")}
                    disabled={!plan.quiz?.length}
                  >
                    Quiz{plan.quizBest ? ` · best ${plan.quizBest.score}/${plan.quizBest.total}` : ""}
                  </button>
                </div>

                {sectionFor(plan.id) === "steps" && (
                  <ul className="plan-steps">
                    {plan.steps.map((s) => {
                      const key = `${plan.id}:${s.id}`;
                      const isStepOpen = !!openSteps[key];
                      return (
                        <li key={s.id} className={`plan-step ${isStepOpen ? "open" : ""}`}>
                          <div className="step-row" onClick={() => toggleStepOpen(key)}>
                            <input
                              type="checkbox"
                              checked={!!s.checked}
                              onClick={(e) => e.stopPropagation()}
                              onChange={async () => {
                                const updated = await toggleStep(uid, plan.id, plan.steps, s.id);
                                setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, steps: updated } : p)));
                              }}
                            />
                            <div className="step-headline">
                              <span className="step-title">{s.title}</span>
                              <p className="step-desc">{s.description}</p>
                            </div>
                            <span className="step-chevron">{isStepOpen ? "▲" : "▼"}</span>
                          </div>
                          {isStepOpen && (
                            <div className="step-lesson">
                              <p>{s.content || s.description}</p>
                              {s.sourceUrl && (
                                <a className="step-source" href={s.sourceUrl} target="_blank" rel="noreferrer">{s.sourceUrl}</a>
                              )}
                              <button className="chat-tutor-btn" onClick={() => openStepChat(key)}>
                                💬 Chat with an AI tutor about this
                              </button>
                              {chatMounted[key] && (
                                <StepTutorChat
                                  topicTitle={s.title}
                                  topicContext={s.content || s.description}
                                  open={!!chatOpen[key]}
                                  onClose={() => closeStepChat(key)}
                                />
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {sectionFor(plan.id) === "flashcards" && (
                  <div className="tp-panel">
                    <FlashcardDeck cards={plan.flashcards} />
                  </div>
                )}

                {sectionFor(plan.id) === "quiz" && (
                  <div className="tp-panel">
                    <PlanQuiz
                      questions={plan.quiz}
                      onComplete={async (score, total) => {
                        if (!plan.quizBest || score > plan.quizBest.score) {
                          await recordQuizScore(uid, plan.id, score, total);
                          setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, quizBest: { score, total, at: new Date().toISOString() } } : p)));
                        }
                      }}
                    />
                  </div>
                )}

                <button className="remove-plan" onClick={() => deletePlan(uid, plan.id)}>Remove this plan</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
