import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { questions } from "./diagnosticQuestions";
import { TOPICS } from "./topics";
import { applyDeepCheckResult } from "./applyDeepCheckResult";
import AnswerExplanation from "./AnswerExplanation";
import "./TopicDeepCheck.css";

const QUESTIONS_PER_CHECK = 10;
const PASS_COUNT = 8; // 80%, same threshold as before, on a real 10-question mixed set

function handAuthoredForTopic(topicId) {
  const level = TOPICS.findIndex((t) => t.id === topicId) + 1;
  return questions[level] || [];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TopicDeepCheck({ uid, node, onClose }) {
  const [bank, setBank] = useState(null); // null while building the pool
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [passed, setPassed] = useState(false);
  const [realWorld, setRealWorld] = useState(null);
  const [confirmingExit, setConfirmingExit] = useState(false);

  useEffect(() => {
    Promise.all([
      getDoc(doc(db, "topicRealWorld", node.id)),
      getDoc(doc(db, "topicBenchmark", node.id)),
      getDoc(doc(db, "topicGenerated", node.id)),
    ]).then(([rwSnap, benchSnap, genSnap]) => {
      if (rwSnap.exists()) setRealWorld(rwSnap.data());

      const authored = handAuthoredForTopic(node.id);
      const benchmark = benchSnap.exists() ? benchSnap.data().items : [];
      const generated = genSnap.exists() ? genSnap.data().items : [];
      const pool = shuffle([...authored, ...benchmark, ...generated]).slice(0, QUESTIONS_PER_CHECK);
      // Gemini-generated questions reliably list the correct option first —
      // confirmed live. Left as-is, "always pick the first answer" would let
      // someone fake mastery on every generated question without knowing anything.
      const shuffledPool = (pool.length > 0 ? pool : authored).map((q) => ({ ...q, options: shuffle(q.options) }));
      setBank(shuffledPool);
    });
  }, [node.id]);

  if (!bank) {
    return <div className="deep-check"><p className="state-msg">Building a real, mixed question set for this topic...</p></div>;
  }

  const current = bank[index];

  function selectAnswer(choice) {
    if (selected) return;
    setSelected(choice);
    if (choice === current.answer) setCorrectCount((c) => c + 1);
  }

  async function next() {
    if (index + 1 < bank.length) {
      setIndex(index + 1);
      setSelected(null);
      return;
    }
    const result = await applyDeepCheckResult(uid, node.id, correctCount, bank.length);
    setPassed(result);
    setDone(true);
  }

  if (done) {
    return (
      <div className="deep-check">
        <p className="verdict">
          {correctCount}/{bank.length} correct — {passed ? "topic marked mastered." : `below the mastery threshold (${PASS_COUNT}/${QUESTIONS_PER_CHECK}), flagged for revision.`}
        </p>

        {realWorld?.items?.length > 0 && (
          <div className="real-world-block">
            <p className="rw-label">Real questions developers actually asked about this — via BigQuery's public StackOverflow dataset</p>
            {realWorld.items.slice(0, 3).map((item) => (
              <a key={item.id} className="rw-item" href={item.url} target="_blank" rel="noreferrer">
                <span className="rw-score">▲ {item.score}</span>
                <span className="rw-title">{item.title}</span>
              </a>
            ))}
          </div>
        )}

        <button className="btn btn-primary btn-block" onClick={onClose}>Close</button>
      </div>
    );
  }

  return (
    <div className="deep-check">
      <div className="progress-strip">
        <div className="deep-check-top-row">
          <p className="meta">
            <span className="meta-topic">Deep check · {node.title}</span>
            <span className="meta-question">
              Question {index + 1} of {bank.length} · {correctCount} correct so far
              {current.source && <span className="source-tag"> · {current.source}</span>}
            </span>
          </p>
          {!confirmingExit ? (
            <button className="end-early-btn" onClick={() => setConfirmingExit(true)}>← Go back</button>
          ) : (
            <span className="end-early-confirm">
              Leave now? This attempt won't be scored.
              <button className="end-early-confirm-yes" onClick={onClose}>Yes, leave</button>
              <button className="end-early-confirm-no" onClick={() => setConfirmingExit(false)}>Keep going</button>
            </span>
          )}
        </div>
        <div className="question-stepper" role="list" aria-label="Question progress">
          {bank.map((_, i) => (
            <span key={i} role="listitem" className={i < index ? "q-seg done" : i === index ? "q-seg current" : "q-seg"} />
          ))}
        </div>
      </div>
      <p className="prompt">{current.prompt}</p>
      <ul className="options">
        {current.options.map((opt, i) => {
          const isSelected = selected === opt;
          const isAnswer = opt === current.answer;
          let cls = "";
          if (selected) {
            if (isAnswer) cls = "correct";
            else if (isSelected) cls = "incorrect";
          }
          return (
            <li key={i}>
              <button className={cls} onClick={() => selectAnswer(opt)} disabled={!!selected}>
                {opt}
              </button>
            </li>
          );
        })}
      </ul>
      {selected && (
        <div className="feedback">
          <p className="verdict">{selected === current.answer ? "Correct." : `Not quite — correct answer: ${current.answer}.`}</p>
          <AnswerExplanation
            prompt={current.prompt}
            options={current.options}
            answer={current.answer}
            source={current.source}
            explanation={current.explanation}
          />
          <button className="btn btn-primary btn-block" onClick={next}>
            {index + 1 < bank.length ? "Next question" : "Finish check"}
          </button>
        </div>
      )}
    </div>
  );
}
