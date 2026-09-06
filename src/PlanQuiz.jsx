import { useMemo, useState } from "react";
import "./PlanQuiz.css";

// Gemini reliably lists the correct option first — confirmed across live
// generations. Left as-is, "always pick the first answer" would be a working
// cheat strategy, so every question's options are shuffled once per question
// (not on every render/selection, which would look glitchy).
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PlanQuiz({ questions, onComplete }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const current = questions?.[index];
  // Keyed on [current, attempt] so retaking the quiz re-shuffles too — reusing
  // the same order on retake would defeat the anti-memorization shuffle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shuffledOptions = useMemo(() => (current ? shuffle(current.options) : []), [current, attempt]);

  if (!questions || questions.length === 0) return null;

  function selectAnswer(choice) {
    if (selected) return;
    setSelected(choice);
    if (choice === current.answer) setCorrectCount((c) => c + 1);
  }

  function next() {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setSelected(null);
      return;
    }
    setDone(true);
    onComplete?.(correctCount, questions.length);
  }

  function retake() {
    setIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setDone(false);
    setAttempt((a) => a + 1);
  }

  if (done) {
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="plan-quiz done">
        <p className="quiz-score">{correctCount}/{questions.length} correct <span className="quiz-pct">({pct}%)</span></p>
        <button className="btn btn-primary btn-block" onClick={retake}>Retake quiz</button>
      </div>
    );
  }

  return (
    <div className="plan-quiz">
      <div className="quiz-progress">
        {questions.map((_, i) => (
          <span key={i} className={i < index ? "seg done" : i === index ? "seg current" : "seg"} />
        ))}
      </div>
      <p className="quiz-meta">Question {index + 1} of {questions.length}</p>
      <p className="quiz-prompt">{current.prompt}</p>
      <ul className="quiz-options">
        {shuffledOptions.map((opt, i) => {
          const isSelected = selected === opt;
          const isAnswer = opt === current.answer;
          let cls = "";
          if (selected) {
            if (isAnswer) cls = "correct";
            else if (isSelected) cls = "incorrect";
          }
          return (
            <li key={i}>
              <button className={cls} onClick={() => selectAnswer(opt)} disabled={!!selected}>{opt}</button>
            </li>
          );
        })}
      </ul>
      {selected && (
        <div className="quiz-feedback">
          <p className="quiz-verdict">{selected === current.answer ? "Correct." : `Not quite — correct answer: ${current.answer}.`}</p>
          {current.explanation && <p className="quiz-explanation">{current.explanation}</p>}
          <button className="btn btn-primary btn-block" onClick={next}>
            {index + 1 < questions.length ? "Next question" : "Finish quiz"}
          </button>
        </div>
      )}
    </div>
  );
}
