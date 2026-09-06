// Pulls real questions from MMLU (cais/mmlu) — the actual gold-standard
// benchmark used to evaluate frontier AI models — via HuggingFace's public
// datasets-server API. No auth, no new dependency, real industry data.
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({ credential: cert(require("../serviceAccountKey.json")) });
const db = getFirestore();

// [topicId, MMLU subject, offset, length]
const PULLS = [
  ["python-basics", "high_school_computer_science", 0, 10],
  ["data-math", "elementary_mathematics", 0, 10],
  ["ml-foundations", "machine_learning", 0, 15],
  ["regression-gd", "machine_learning", 15, 15],
  ["neural-nets", "machine_learning", 30, 15],
  ["deep-learning", "college_computer_science", 0, 10],
  ["transformers", "machine_learning", 45, 15],
  ["llms-applied", "computer_security", 0, 10],
];

async function fetchRows(subject, offset, length) {
  const url = `https://datasets-server.huggingface.co/rows?dataset=cais%2Fmmlu&config=${subject}&split=test&offset=${offset}&length=${length}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.rows.map((r) => r.row);
}

async function run() {
  for (const [topicId, subject, offset, length] of PULLS) {
    const rows = await fetchRows(subject, offset, length);
    const items = rows
      .filter((r) => r.choices?.length === 4 && typeof r.answer === "number")
      .map((r, i) => ({
        id: `mmlu-${subject}-${offset + i}`,
        prompt: r.question,
        options: r.choices,
        answer: r.choices[r.answer],
        subject,
        source: "MMLU (cais/mmlu)",
      }));
    await db.collection("topicBenchmark").doc(topicId).set({
      topicId,
      subject,
      items,
      fetchedAt: new Date().toISOString(),
    });
    console.log(`${topicId}: stored ${items.length} real MMLU questions (subject: ${subject})`);
  }
  process.exit(0);
}
run().catch((err) => {
  console.error(err);
  process.exit(1);
});
