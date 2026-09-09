import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { questions as authoredQuestions } from "./diagnosticQuestions";
import { TOPICS } from "./topics";
import AnswerExplanation from "./AnswerExplanation";
import MathText from "./MathText";
import "./DiagnosticQuiz.css";

const QUESTIONS_PER_TOPIC = 4;
const PASS_RATIO = 0.75;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Builds the full run: every topic, QUESTIONS_PER_TOPIC real questions each,
// mixed from the hand-authored bank, the real MMLU/AGIEval benchmark pool,
// and Gemini-generated questions.
async function buildFullRun() {
  const [benchSnap, genSnap] = await Promise.all([
    getDocs(collection(db, "topicBenchmark")),
    getDocs(collection(db, "topicGenerated")),
  ]);
  const benchByTopic = {};
  benchSnap.forEach((d) => { benchByTopic[d.id] = d.data().items || []; });
  const genByTopic = {};
  genSnap.forEach((d) => { genByTopic[d.id] = d.data().items || []; });

  return TOPICS.map((topic, i) => {
    const authored = authoredQuestions[i + 1] || [];
    const benchmark = benchByTopic[topic.id] || [];
    const generated = genByTopic[topic.id] || [];
    const picked = shuffle([...authored, ...benchmark, ...generated]).slice(0, QUESTIONS_PER_TOPIC);
    // Gemini-generated questions reliably list the correct option first —
    // confirmed live. Left as-is, "always pick the first answer" would let
    // someone fake mastery on every generated question without knowing anything.
    const withShuffledOptions = picked.map((q) => ({ ...q, options: shuffle(q.options) }));
    return { topic, questions: withShuffledOptions };
  });
}

export default function Diagnostic({ onComplete }) {
  const [run, setRun] = useState(null); // [{ topic, questions }] for all 8 topics
  const [topicIndex, setTopicIndex] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [topicResults, setTopicResults] = useState([]); // [{ topicId, correct, total }]
  const [currentCorrect, setCurrentCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  useEffect(() => {
    buildFullRun().then(setRun);
  }, []);

  if (!run) {
    return <div className="diagnostic"><p className="state-msg">Building your placement test — 4 real questions per topic, 32 total...</p></div>;
  }

  const totalTopics = run.length;
  const { topic, questions: topicQuestions } = run[topicIndex];
  const current = topicQuestions[qIndex];
  const questionsInTopic = topicQuestions.length;

  function selectAnswer(choice) {
    if (selected) return;
    setSelected(choice);
    if (choice === current.answer) setCurrentCorrect((c) => c + 1);
  }

  function next() {
    const isLastQInTopic = qIndex + 1 >= questionsInTopic;
    const finalCorrectForTopic = currentCorrect; // already includes this answer

    if (!isLastQInTopic) {
      setQIndex(qIndex + 1);
      setSelected(null);
      return;
    }

    const newResults = [...topicResults, { topicId: topic.id, correct: finalCorrectForTopic, total: questionsInTopic }];
    setTopicResults(newResults);
    setCurrentCorrect(0);
    setSelected(null);

    if (topicIndex + 1 >= totalTopics) {
      setDone(true);
      onComplete?.(newResults);
    } else {
      setTopicIndex(topicIndex + 1);
      setQIndex(0);
    }
  }

  function endEarly() {
    // Only fully-completed topics count — the in-progress topic's partial
    // answers aren't a fair 3/4-style score, so they're dropped rather than
    // recorded as a failure. applyFullDiagnosticResult already treats any
    // topic missing from the results as "not yet assessed," so this is safe.
    setDone(true);
    onComplete?.(topicResults);
  }

  if (done) {
    const totalCorrect = topicResults.reduce((s, r) => s + r.correct, 0);
    const totalQuestions = topicResults.reduce((s, r) => s + r.total, 0);
    const endedEarly = topicResults.length < totalTopics;
    return (
      <div className="diagnostic done">
        <p className="verdict">
          {totalCorrect}/{totalQuestions} correct across {topicResults.length} of {totalTopics} topics
          {endedEarly ? " (ended early)" : ""}.
        </p>
        <ul className="topic-results">
          {topicResults.map((r) => {
            const t = TOPICS.find((tt) => tt.id === r.topicId);
            const passed = r.correct / r.total >= PASS_RATIO;
            return (
              <li key={r.topicId} className={passed ? "passed" : "not-passed"}>
                <span className="tr-title">{t.title}</span>
                <span className="tr-score">{r.correct}/{r.total} {passed ? "✓ mastered" : ""}</span>
              </li>
            );
          })}
        </ul>
        <p className="explanation">
          Your Path tab has been updated to match — every topic you scored 3/4 or better on is marked mastered directly, even skipping ahead.
          {endedEarly ? " Topics you didn't reach are left unassessed rather than marked as failed — come back and retake anytime to cover the rest." : " Retake anytime for a fresh run."}
        </p>
      </div>
    );
  }

  return (
    <div className="diagnostic">
      <div className="progress-strip">
        <div className="topic-stepper" role="list" aria-label="Topic progress">
          {run.map((r, i) => (
            <span
              key={r.topic.id}
              role="listitem"
              title={r.topic.title}
              className={i < topicIndex ? "topic-seg done" : i === topicIndex ? "topic-seg current" : "topic-seg"}
            />
          ))}
        </div>
        <div className="diagnostic-top-row">
          <p className="meta">
            <span className="meta-topic">Topic {topicIndex + 1}/{totalTopics}: {topic.title}</span>
            <span className="meta-question">
              Question {qIndex + 1} of {questionsInTopic}
              {current.source && <span className="source-tag"> · {current.source}</span>}
            </span>
          </p>
          {!confirmingEnd ? (
            <button className="end-early-btn" onClick={() => setConfirmingEnd(true)}>End test now</button>
          ) : (
            <span className="end-early-confirm">
              {topicResults.length === 0
                ? "End with no topics scored yet?"
                : `End here? ${topicResults.length}/${totalTopics} topics scored so far.`}
              <button className="end-early-confirm-yes" onClick={endEarly}>Yes, end it</button>
              <button className="end-early-confirm-no" onClick={() => setConfirmingEnd(false)}>Keep going</button>
            </span>
          )}
        </div>
        <div className="question-stepper" role="list" aria-label="Question progress in this topic">
          {topicQuestions.map((_, i) => (
            <span key={i} role="listitem" className={i < qIndex ? "q-seg done" : i === qIndex ? "q-seg current" : "q-seg"} />
          ))}
        </div>
      </div>
      <p className="prompt"><MathText text={current.prompt} /></p>
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
                <MathText text={opt} />
              </button>
            </li>
          );
        })}
      </ul>
      {selected && (
        <div className="feedback">
          <p className="verdict">
            {selected === current.answer
              ? "Correct."
              : <>Not quite — correct answer: <MathText text={current.answer} />.</>}
          </p>
          <AnswerExplanation
            prompt={current.prompt}
            options={current.options}
            answer={current.answer}
            source={current.source}
            explanation={current.explanation}
          />
          <button className="btn btn-primary btn-block" onClick={next}>
            {qIndex + 1 < questionsInTopic ? "Next question" : topicIndex + 1 < totalTopics ? `Next topic: ${run[topicIndex + 1].topic.title}` : "Finish"}
          </button>
        </div>
      )}
    </div>
  );
}
