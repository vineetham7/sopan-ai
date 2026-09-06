import { collection, deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function savePlan(uid, plan) {
  const ref = doc(collection(db, "users", uid, "plans"));
  await setDoc(ref, {
    title: plan.title,
    steps: plan.steps,
    flashcards: plan.flashcards || [],
    quiz: plan.quiz || [],
    quizBest: null,
    sources: plan.sources || [],
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function recordQuizScore(uid, planId, score, total) {
  await updateDoc(doc(db, "users", uid, "plans", planId), {
    quizBest: { score, total, at: new Date().toISOString() },
  });
}

export async function toggleStep(uid, planId, steps, stepId) {
  const updated = steps.map((s) => (s.id === stepId ? { ...s, checked: !s.checked } : s));
  await updateDoc(doc(db, "users", uid, "plans", planId), { steps: updated });
  return updated;
}

export async function deletePlan(uid, planId) {
  await deleteDoc(doc(db, "users", uid, "plans", planId));
}
