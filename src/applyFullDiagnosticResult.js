import { doc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { TOPICS } from "./topics";

const PASS_RATIO = 0.75; // 3/4

// The full diagnostic now actually tests every topic (4 real questions
// each, no early stop) instead of guessing a single placement level from
// a handful of questions. Each topic's status is set from its own real
// score — a topic can be marked mastered directly if the learner already
// knows it, skipping ahead of the linear chain; topics that aren't passed
// stay locked unless their prerequisites are already mastered.
export async function applyFullDiagnosticResult(uid, perTopicResults) {
  const scoreById = Object.fromEntries(perTopicResults.map((r) => [r.topicId, r]));
  const passedById = {};
  TOPICS.forEach((t) => {
    const r = scoreById[t.id];
    passedById[t.id] = r ? r.correct / r.total >= PASS_RATIO : false;
  });

  const batch = writeBatch(db);
  TOPICS.forEach((topic, i) => {
    let status;
    if (passedById[topic.id]) {
      status = "mastered";
    } else {
      // The chain is linear — each topic's only prerequisite is the one
      // right before it (see topics.js).
      const prereqMet = i === 0 || passedById[TOPICS[i - 1].id];
      status = prereqMet ? "unlocked" : "locked";
    }
    batch.update(doc(db, "users", uid, "skillGraph", topic.id), { status });
  });
  await batch.commit();

  return passedById;
}
