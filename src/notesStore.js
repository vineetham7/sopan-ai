import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// One doc per user holding every note card — same whole-array-write shape
// as bookmarkStore.js. Each item: { id, title, text }.
function ref(uid) {
  return doc(db, "users", uid, "data", "notes");
}

export async function getNotes(uid) {
  const snap = await getDoc(ref(uid));
  if (!snap.exists()) return [];
  const data = snap.data();
  // Older single-textarea shape ({ text }) migrates into one card instead
  // of silently vanishing the first time someone who used it reopens Notes.
  if (Array.isArray(data.items)) return data.items;
  if (data.text) return [{ id: "note-1", title: "Notes", text: data.text }];
  return [];
}

export async function saveNotes(uid, items) {
  await setDoc(ref(uid), { items });
}
