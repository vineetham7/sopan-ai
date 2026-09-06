// Pulls real questions from AGIEval (hails/agieval-*, the canonical
// lm-eval-harness hosting) — real human qualification-exam questions
// (SAT, LSAT). Only applied to topics where the subject genuinely fits —
// AGIEval has no CS/ML-specific subject, so it's not forced onto every topic.
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({ credential: cert(require("../serviceAccountKey.json")) });
const db = getFirestore();

// [topicId, HF dataset id, length]
const PULLS = [
  ["data-math", "hails/agieval-sat-math", 10],
  ["ml-foundations", "hails/agieval-logiqa-en", 10],
  ["regression-gd", "hails/agieval-lsat-lr", 10],
];

async function fetchRows(dataset, length) {
  const encoded = encodeURIComponent(dataset);
  const url = `https://datasets-server.huggingface.co/rows?dataset=${encoded}&config=default&split=test&offset=0&length=${length}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.rows.map((r) => r.row);
}

function parsePrompt(query) {
  return query.split("Answer Choices:")[0].replace(/^Q:\s*/, "").trim();
}

async function run() {
  for (const [topicId, dataset, length] of PULLS) {
    const rows = await fetchRows(dataset, length);
    const items = rows
      .filter((r) => r.choices?.length >= 2 && Array.isArray(r.gold) && r.gold.length > 0)
      .map((r, i) => ({
        id: `agieval-${dataset.split("/")[1]}-${i}`,
        prompt: parsePrompt(r.query),
        options: r.choices,
        answer: r.choices[r.gold[0]],
        subject: dataset.split("/")[1],
        source: "AGIEval (hails)",
      }));

    const ref = db.collection("topicBenchmark").doc(topicId);
    const existing = await ref.get();
    const priorItems = existing.exists ? existing.data().items || [] : [];
    await ref.set(
      { topicId, items: [...priorItems, ...items], updatedAt: new Date().toISOString() },
      { merge: true }
    );
    console.log(`${topicId}: added ${items.length} real AGIEval questions (${dataset})`);
  }
  process.exit(0);
}
run().catch((err) => {
  console.error(err);
  process.exit(1);
});
