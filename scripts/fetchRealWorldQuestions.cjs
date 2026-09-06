// Pulls real, accepted-answer Q&A from the public BigQuery StackOverflow
// dataset (bigquery-public-data.stackoverflow) for each of the 8 skill-graph
// topics, and stores them in Firestore as real-world grounding material —
// not authored, not invented, actual developer questions with real answers.
const { BigQuery } = require("@google-cloud/bigquery");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = require("../serviceAccountKey.json");
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const bq = new BigQuery({ projectId: "sopan-ai", credentials: serviceAccount });

// Real tags, verified against bigquery-public-data.stackoverflow.tags counts
// before picking these (not guessed).
const TOPIC_TAGS = {
  "python-basics": "python",
  "data-math": "numpy",
  "ml-foundations": "machine-learning",
  "regression-gd": "linear-regression",
  "neural-nets": "neural-network",
  "deep-learning": "deep-learning",
  "transformers": "huggingface-transformers",
  "llms-applied": "openai",
};

function stripHtml(html) {
  return html
    .replace(/<pre>[\s\S]*?<\/pre>/g, " [code example] ") // keep code blocks short
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchForTopic(tag) {
  const query = `
    SELECT q.id AS question_id, q.title, q.body AS question_body, q.score,
           a.body AS answer_body
    FROM \`bigquery-public-data.stackoverflow.posts_questions\` q
    JOIN \`bigquery-public-data.stackoverflow.posts_answers\` a
      ON q.accepted_answer_id = a.id
    WHERE q.tags LIKE '%${tag}%' AND q.score > 5
    ORDER BY q.score DESC
    LIMIT 8
  `;
  const [rows] = await bq.query({ query });
  return rows.map((r) => ({
    id: String(r.question_id),
    title: r.title,
    url: `https://stackoverflow.com/questions/${r.question_id}`,
    questionSnippet: stripHtml(r.question_body).slice(0, 600),
    answerSnippet: stripHtml(r.answer_body).slice(0, 600),
    score: r.score,
  }));
}

async function run() {
  for (const [topicId, tag] of Object.entries(TOPIC_TAGS)) {
    console.log(`querying tag "${tag}" for topic ${topicId}...`);
    const items = await fetchForTopic(tag);
    await db.collection("topicRealWorld").doc(topicId).set({
      topicId,
      sourceTag: tag,
      items,
      fetchedAt: new Date().toISOString(),
    });
    console.log(`  stored ${items.length} real Q&A for ${topicId}`);
  }
  process.exit(0);
}
run().catch((err) => {
  console.error(err);
  process.exit(1);
});
