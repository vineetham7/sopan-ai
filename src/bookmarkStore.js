import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// One doc per user holding the full bookmarked items — Insta's feed is
// regenerated fresh on every load (real arXiv/HN results change over time),
// so a bookmark has to keep its own copy of the item, not just a URL
// pointing back at a feed that may no longer contain it.
function ref(uid) {
  return doc(db, "users", uid, "data", "instaBookmarks");
}

export async function toggleBookmark(uid, item) {
  const snap = await getDoc(ref(uid));
  const current = snap.exists() ? snap.data().items || [] : [];
  const exists = current.some((i) => i.url === item.url);
  const updated = exists ? current.filter((i) => i.url !== item.url) : [...current, item];
  await setDoc(ref(uid), { items: updated });
  return updated;
}

export async function getBookmarks(uid) {
  const snap = await getDoc(ref(uid));
  return snap.exists() ? snap.data().items || [] : [];
}
