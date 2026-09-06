import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { TOPICS } from "./topics";

// Every learner (anonymous or upgraded) gets their own skillGraph subtree —
// this seeds it once, the first time we see that uid, mirroring what
// scripts/seed.cjs does for the shared admin copy.
export async function ensureSkillGraphSeeded(uid) {
  const ref = collection(db, "users", uid, "skillGraph");
  const existing = await getDocs(ref);
  if (!existing.empty) return;

  const batch = writeBatch(db);
  TOPICS.forEach((topic, i) => {
    batch.set(doc(ref, topic.id), {
      id: topic.id,
      title: topic.title,
      status: i === 0 ? "unlocked" : "locked",
      prerequisites: i === 0 ? [] : [TOPICS[i - 1].id],
      selfAssessment: null,
    });
  });
  await batch.commit();
}
