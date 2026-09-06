import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { TOPICS } from "./topics";
import { sm2 } from "./sm2";

const PASS_THRESHOLD = 0.8; // 5/6

// A Deep Check is a real, full-battery test of ONE topic — unlike the
// global diagnostic (which samples a few questions across all 8 topics),
// this is volume-and-variety mastery evidence for a single node. Every
// result also feeds SM-2, so mastery isn't a permanent tick — it comes
// back due for review on a real schedule.
export async function applyDeepCheckResult(uid, topicId, correctCount, total) {
  const passed = correctCount / total >= PASS_THRESHOLD;
  const ref = doc(db, "users", uid, "skillGraph", topicId);

  const snap = await getDoc(ref);
  const prev = snap.data();
  const srs = sm2(
    { interval: prev?.srsInterval, ease: prev?.srsEase, reps: prev?.srsReps },
    passed ? 5 : 2
  );

  const updates = {
    lastChecked: new Date().toISOString(),
    srsInterval: srs.interval,
    srsEase: srs.ease,
    srsReps: srs.reps,
    srsDueDate: srs.dueDate,
  };

  if (passed) {
    updates.status = "mastered";
    updates.selfAssessment = null;
  } else {
    // Failing a real check is itself useful signal — auto-flag for revision
    // rather than leaving a stale "Confident" tap from before.
    updates.selfAssessment = "revision";
  }
  await updateDoc(ref, updates);

  if (passed) {
    const idx = TOPICS.findIndex((t) => t.id === topicId);
    const next = TOPICS[idx + 1];
    if (next) {
      const nextRef = doc(db, "users", uid, "skillGraph", next.id);
      const nextSnap = await getDoc(nextRef);
      if (nextSnap.exists() && nextSnap.data().status === "locked") {
        await updateDoc(nextRef, { status: "unlocked" });
      }
    }
  }

  return passed;
}
