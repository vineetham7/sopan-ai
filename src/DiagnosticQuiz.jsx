import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { questions as authoredQuestions } from "./diagnosticQuestions";
import { TOPICS } from "./topics";
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

  if (done) {
    const totalCorrect = topicResults.reduce((s, r) => s + r.correct, 0);
    const totalQuestions = topicResults.reduce((s, r) => s + r.total, 0);
    return (
      <div className="diagnostic done">
        <p className="verdict">
          {totalCorrect}/{totalQuestions} correct across all 8 topics.
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
        <p className="explanation">Your Path tab has been updated to match — every topic you scored 3/4 or better on is marked mastered directly, even skipping ahead. Retake anytime for a fresh run.</p>
      </div>
    );
  }

  return (
    <div className="diagnostic">
      <p className="meta">
        Topic {topicIndex + 1}/{totalTopics}: {topic.title} · question {qIndex + 1}/{questionsInTopic}
        {current.source && <span className="source-tag"> · {current.source}</span>}
      </p>
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
          <p className="explanation">
            {current.explanation || `No explanation provided — this is a real exam question from ${current.source}.`}
          </p>
          <button className="btn btn-primary btn-block" onClick={next}>
            {qIndex + 1 < questionsInTopic ? "Next question" : topicIndex + 1 < totalTopics ? `Next topic: ${run[topicIndex + 1].topic.title}` : "Finish"}
          </button>
        </div>
      )}
    </div>
  );
}
