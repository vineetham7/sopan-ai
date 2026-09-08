const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { GoogleGenAI } = require("@google/genai");

initializeApp({
  credential: cert(require("../serviceAccountKey.json")),
});
const db = getFirestore();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 8 real chunks covering Agentic AI, added because the original 20-chunk
// corpus (Python basics, NumPy, what-is-ML/loss/NLP) had nothing about
// agents — a real user's "Agentic AI" plan came back titled correctly but
// built from unrelated basics chunks, since findNearest has no relevance
// floor and just returns its 5 least-bad matches regardless of fit.
// Every chunk here is a genuine paraphrase of a real, fetched source
// (Anthropic's "Building Effective Agents", Dec 2024) — not LLM-invented.
// Historical record only: actually run once via a temporary onCall Cloud
// Function (ingestAgenticChunks, since removed), because the Gemini API
// key exists only as a Cloud Functions secret in this environment, not a
// local GEMINI_API_KEY env var this script could read directly.
const SOURCE = "https://www.anthropic.com/engineering/building-effective-agents";
const chunks = [
  {
    id: "anthropic-agents-what-are-agents",
    text: "An \"agentic system\" covers two architectural patterns: workflows, where LLMs and tools are orchestrated through predefined code paths, and agents, where the LLM dynamically directs its own process and tool use, staying in control of how it accomplishes a task rather than following a fixed script.",
    source: SOURCE,
  },
  {
    id: "anthropic-agents-augmented-llm",
    text: "The basic building block of any agentic system is an LLM enhanced with augmentations — retrieval, tools, and memory. Modern models can actively use these themselves: generating their own search queries, choosing which tool fits a given step, and deciding what information is worth keeping for later.",
    source: SOURCE,
  },
  {
    id: "anthropic-agents-prompt-chaining",
    text: "Prompt chaining decomposes a task into a sequence of steps, where each LLM call processes the output of the one before it. Programmatic checks can be inserted between steps to confirm the process is still on track before continuing — useful when a task cleanly breaks into fixed subtasks and you want to trade latency for higher accuracy.",
    source: SOURCE,
  },
  {
    id: "anthropic-agents-routing",
    text: "Routing classifies an incoming input and sends it to a specialized followup task or prompt, rather than one prompt trying to handle every kind of input. It works well when there are genuinely distinct categories of input that are each better handled separately — for example, sending simple questions to a smaller, cheaper model and hard ones to a more capable one.",
    source: SOURCE,
  },
  {
    id: "anthropic-agents-orchestrator-workers",
    text: "In the orchestrator-workers pattern, a central LLM dynamically breaks a task into subtasks, delegates each to a worker LLM call, and synthesizes their results. Unlike simple parallelization, the subtasks aren't fixed in advance — the orchestrator decides them based on the specific input, which suits tasks like a coding change where you can't predict up front which files need editing.",
    source: SOURCE,
  },
  {
    id: "anthropic-agents-when-to-use",
    text: "Agentic systems trade latency and cost for better task performance, so the first recommendation is finding the simplest solution possible and only adding agentic complexity when it's actually needed — for many real applications, a single well-optimized LLM call with retrieval is enough. Full autonomous agents make sense specifically for open-ended problems where the number of steps can't be predicted and a fixed path can't be hardcoded.",
    source: SOURCE,
  },
  {
    id: "anthropic-agents-autonomous-loop",
    text: "An autonomous agent typically begins with a task from a human, then plans and operates independently — at each step, it gathers real \"ground truth\" from its environment (a tool call's result, code actually executing) to judge its own progress, rather than assuming its plan is working. Because errors can compound over many turns, agents usually need stopping conditions like a maximum iteration count, and testing in a sandboxed environment first.",
    source: SOURCE,
  },
  {
    id: "anthropic-agents-core-principles",
    text: "Three principles for building effective agents: keep the agent's design as simple as possible, prioritize transparency by explicitly showing its planning steps rather than hiding them, and carefully design the \"agent-computer interface\" — how tools are documented and structured — since agents are often just an LLM calling tools in a loop, so how clearly those tools are described directly determines how well the agent performs.",
    source: SOURCE,
  },
];

async function run() {
  for (const chunk of chunks) {
    const { embeddings } = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: chunk.text,
      config: { outputDimensionality: 768 },
    });
    await db.collection("contentChunks").doc(chunk.id).set({
      text: chunk.text,
      source: chunk.source,
      embedding: FieldValue.vector(embeddings[0].values),
    });
    console.log("embedded", chunk.id);
  }
  process.exit(0);
}
run();
