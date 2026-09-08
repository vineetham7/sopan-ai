import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// One doc per user holding the scratchpad's plain text — same shape as
// bookmarkStore.js's single-doc pattern.
function ref(uid) {
  return doc(db, "users", uid, "data", "notes");
}

export async function getNotes(uid) {
  const snap = await getDoc(ref(uid));
  return snap.exists() ? snap.data().text || "" : "";
}

export async function saveNotes(uid, text) {
  await setDoc(ref(uid), { text });
}
