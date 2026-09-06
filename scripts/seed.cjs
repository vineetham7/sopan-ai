const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({
  credential: cert(require("../serviceAccountKey.json")),
});
const db = getFirestore();

// The 0 -> expert AI/ML path — must stay in the same order as src/topics.js,
// since the diagnostic places a learner by level index (1-8), not by id.
const nodes = [
  { id: "python-basics",  title: "Python Basics",                status: "unlocked", prerequisites: [] },
  { id: "data-math",      title: "Data & Math for ML",            status: "locked",   prerequisites: ["python-basics"] },
  { id: "ml-foundations", title: "Core ML Concepts",              status: "locked",   prerequisites: ["data-math"] },
  { id: "regression-gd",  title: "Regression & Gradient Descent", status: "locked",   prerequisites: ["ml-foundations"] },
  { id: "neural-nets",    title: "Neural Network Basics",         status: "locked",   prerequisites: ["regression-gd"] },
  { id: "deep-learning",  title: "Deep Learning Practice",        status: "locked",   prerequisites: ["neural-nets"] },
  { id: "transformers",   title: "Transformers & Attention",      status: "locked",   prerequisites: ["deep-learning"] },
  { id: "llms-applied",   title: "Applied LLMs & RAG",            status: "locked",   prerequisites: ["transformers"] },
];

async function run() {
  // Clear stale docs from the old 5-node Python-only graph first.
  const existing = await db.collection("skillGraph").get();
  const keepIds = new Set(nodes.map((n) => n.id));
  for (const doc of existing.docs) {
    if (!keepIds.has(doc.id)) {
      await doc.ref.delete();
      console.log("removed stale", doc.id);
    }
  }

  for (const node of nodes) {
    await db.collection("skillGraph").doc(node.id).set(node);
    console.log("seeded", node.id);
  }
  process.exit(0);
}
run();
