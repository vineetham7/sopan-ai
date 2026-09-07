import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { TOPICS } from "./topics";
import { savePlan } from "./planStore";
import FlashcardDeck from "./FlashcardDeck";
import PlanQuiz from "./PlanQuiz";
import StepTutorChat from "./StepTutorChat";
import "./PlanAssembly.css";

const assemblePlan = httpsCallable(functions, "assemblePlan");

export default function PlanAssembly({ uid }) {
  const [goal, setGoal] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error | done
  const [result, setResult] = useState(null);
  const [checkedSteps, setCheckedSteps] = useState({});
  const [openSteps, setOpenSteps] = useState({});
  const [chatMounted, setChatMounted] = useState({});
  const [chatOpen, setChatOpen] = useState({});
  const [quizTutorContext, setQuizTutorContext] = useState(null);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved
  const [section, setSection] = useState("steps"); // steps | flashcards | quiz
  const [lastTopicId, setLastTopicId] = useState(null);

  async function run(topicGoal, topicId = null) {
    const finalGoal = topicGoal ?? goal;
    if (!finalGoal.trim()) return;
    setStatus("loading");
    setError(null);
    setSaveStatus("idle");
    setLastTopicId(topicId);
    try {
      const res = await assemblePlan({ goal: finalGoal });
      setResult(res.data);
      setCheckedSteps({});
      setSection("steps");
      setStatus("done");
    } catch (err) {
      setError(err.message ?? String(err));
      setStatus("error");
    }
  }

  function submit(e) {
    e.preventDefault();
    run();
  }

  function toggleLocal(stepId) {
    setCheckedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  }

  function toggleOpen(stepId) {
    setOpenSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  }

  function openChat(stepId) {
    setChatMounted((prev) => ({ ...prev, [stepId]: true }));
    setChatOpen((prev) => ({ ...prev, [stepId]: true }));
  }

  function closeChat(stepId) {
    setChatOpen((prev) => ({ ...prev, [stepId]: false }));
  }

  function askTutorAboutQuestion({ prompt, answer, explanation }) {
    setQuizTutorContext(
      `I got this quiz question wrong: "${prompt}" — the correct answer was "${answer}".` +
      (explanation ? ` Explanation given: ${explanation}` : "")
    );
    openChat("quiz");
  }

  async function handleSave() {
    setSaveStatus("saving");
    const steps = result.steps.map((s) => ({ ...s, checked: !!checkedSteps[s.id] }));
    await savePlan(uid, {
      title: result.title,
      steps,
      flashcards: result.flashcards,
      quiz: result.quiz,
      sources: result.sources,
    });
    setSaveStatus("saved");
  }

  return (
    <div className="plan-assembly">
      <p className="topic-picker-label">Pick a topic, or describe your own goal:</p>
      <div className="topic-picker">
        {TOPICS.map((t) => (
          <button key={t.id} className="topic-chip" onClick={() => run(`Understand ${t.title}`, t.id)} disabled={status === "loading"}>
            {t.title}
          </button>
        ))}
      </div>

      <form onSubmit={submit}>
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Understand how neural networks learn"
        />
        <button className="btn btn-primary" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Assembling..." : "Get plan"}
        </button>
      </form>

      {status === "error" && <p className="error">Couldn't assemble a plan: {error}</p>}

      {status === "done" && result && (
        <div className="result">
          <h3 className="plan-title">{result.title}</h3>

          <div className="result-tabs">
            <button className={section === "steps" ? "active" : ""} onClick={() => setSection("steps")}>
              Steps · {result.steps.length}
            </button>
            <button className={section === "flashcards" ? "active" : ""} onClick={() => setSection("flashcards")} disabled={!result.flashcards?.length}>
              Flashcards · {result.flashcards?.length || 0}
            </button>
            <button className={section === "quiz" ? "active" : ""} onClick={() => setSection("quiz")} disabled={!result.quiz?.length}>
              Quiz · {result.quiz?.length || 0}
            </button>
          </div>

          {section === "steps" && (
            <ul className="plan-steps reveal-stagger">
              {result.steps.map((s, i) => {
                const isOpen = !!openSteps[s.id];
                return (
                  <li key={s.id} className={`plan-step ${isOpen ? "open" : ""}`} style={{ animationDelay: `${i * 0.06}s` }}>
                    <div className="step-row" onClick={() => toggleOpen(s.id)}>
                      <input
                        type="checkbox"
                        checked={!!checkedSteps[s.id]}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleLocal(s.id)}
                      />
                      <div className="step-headline">
                        <span className="step-title">{s.title}</span>
                        <p className="step-desc">{s.description}</p>
                      </div>
                      <span className="step-chevron">{isOpen ? "▲" : "▼"}</span>
                    </div>
                    {isOpen && (
                      <div className="step-lesson">
                        <p>{s.content || s.description}</p>
                        {s.sourceUrl && (
                          <a className="step-source" href={s.sourceUrl} target="_blank" rel="noreferrer">{s.sourceUrl}</a>
                        )}
                        <button className="chat-tutor-btn" onClick={() => openChat(s.id)}>
                          💬 Chat with an AI tutor about this
                        </button>
                        {chatMounted[s.id] && (
                          <StepTutorChat
                            topicTitle={s.title}
                            topicContext={s.content || s.description}
                            open={!!chatOpen[s.id]}
                            onClose={() => closeChat(s.id)}
                          />
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {section === "flashcards" && (
            <div className="result-panel">
              <FlashcardDeck cards={result.flashcards} />
            </div>
          )}

          {section === "quiz" && (
            <div className="result-panel">
              <PlanQuiz questions={result.quiz} onAskTutor={askTutorAboutQuestion} />
              {chatMounted.quiz && (
                <StepTutorChat
                  topicTitle="Your missed quiz question"
                  topicContext={quizTutorContext}
                  open={!!chatOpen.quiz}
                  onClose={() => closeChat("quiz")}
                />
              )}
            </div>
          )}

          <button className="btn btn-primary btn-block" onClick={handleSave} disabled={saveStatus !== "idle"}>
            {saveStatus === "saved" ? "Saved to Path tab ✓" : saveStatus === "saving" ? "Saving..." : "Save this plan to Path"}
          </button>

          {(() => {
            const currentIdx = lastTopicId ? TOPICS.findIndex((t) => t.id === lastTopicId) : -1;
            const next = currentIdx >= 0 && currentIdx + 1 < TOPICS.length ? TOPICS[currentIdx + 1] : null;
            if (!next) return null;
            return (
              <div className="related-next">
                Since you explored <strong>{TOPICS[currentIdx].title}</strong>, the next real step in this curriculum is{" "}
                <strong>{next.title}</strong>.
                <button className="related-next-btn" onClick={() => run(`Understand ${next.title}`, next.id)}>
                  Build a plan for it →
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
