const {setGlobalOptions} = require("firebase-functions");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const {GoogleGenAI} = require("@google/genai");
const admin = require("firebase-admin");
admin.initializeApp();
// Force REST transport instead of gRPC — this sandbox's outbound networking
// blocks the Admin SDK's default gRPC channel to Firestore (confirmed: plain
// HTTPS/REST to firestore.googleapis.com works fine, gRPC hangs to timeout).
// preferRest is a supported, production-safe firebase-admin setting.
admin.firestore().settings({preferRest: true});

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit.
setGlobalOptions({maxInstances: 10});

const geminiKey = defineSecret("GEMINI_API_KEY");

// Real, stable, generally-available model (matches every planning doc) — not
// a preview model, which is what "gemini-3.7-flash" turned out to be: a
// 5-request/day free-tier cap that made every real call fail with a 429.
// Then gemini-2.5-flash itself turned out to be deprecated for new users —
// confirmed via a live 404 from the API, which named the replacement itself.
const GEMINI_MODEL = "gemini-3.6-flash";

exports.assemblePlan = onCall({secrets: [geminiKey]}, async (request) => {
  const ai = new GoogleGenAI({apiKey: geminiKey.value()});
  const {goal} = request.data;

  let embeddings;
  try {
    ({embeddings} = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: goal,
      config: {outputDimensionality: 768},
    }));
  } catch (err) {
    throw new HttpsError("unavailable", `Couldn't embed the goal: ${err.message}`);
  }

  const db = admin.firestore();
  const results = await db.collection("contentChunks").findNearest({
    vectorField: "embedding",
    queryVector: embeddings[0].values,
    limit: 5,
    distanceMeasure: "COSINE",
  }).get();
  const matched = results.docs.map((d) => d.data());

  let interaction;
  try {
    interaction = await ai.interactions.create({
      model: GEMINI_MODEL,
      input:
        `Learner's goal: ${goal}\n\n` +
        "Using only the material below, respond with strict JSON only: an object " +
        "{\"title\": \"...\", \"steps\": [{\"title\": \"...\", \"description\": \"...\", \"content\": \"...\", \"sourceUrl\": \"...\"}], " +
        "\"flashcards\": [{\"question\": \"...\", \"answer\": \"...\"}], " +
        "\"quiz\": [{\"prompt\": \"...\", \"options\": [\"...\",\"...\",\"...\",\"...\"], \"answer\": \"...\", \"explanation\": \"...\"}]}.\n" +
        "title: a short (5-8 word) name for this plan, based on the goal.\n" +
        "steps: 5 concrete, sequential steps, each teaching one piece of the goal — not just a checklist item. " +
        "For each step:\n" +
        "  description: one sentence, a preview of what this step covers.\n" +
        "  content: the actual lesson — 3-5 sentences that genuinely teach the concept in plain language, " +
        "with a concrete example where it helps. This is what the learner reads to understand the idea, not " +
        "just a pointer to go read elsewhere.\n" +
        "  Both description and content must be grounded only in the material below — do not add information " +
        "that isn't there. sourceUrl must be one of the source URLs given below, whichever the step is drawn from.\n" +
        "flashcards: exactly 5 question/answer pairs testing recall of the concrete facts and definitions " +
        "in the material below — short question, short answer, grounded only in that material.\n" +
        "quiz: exactly 5 multiple-choice questions testing understanding of the material below. Each has " +
        "exactly 4 options, only one correct (answer must exactly match one option string), and a one-sentence " +
        "explanation of why it's correct. Grounded only in the material below, vary difficulty across the set.\n" +
        "No markdown, no extra text, JSON object only.\n\n" +
        matched.map((m) => `- ${m.text} (source: ${m.source})`).join("\n"),
    });
  } catch (err) {
    throw new HttpsError("unavailable", `Gemini couldn't assemble the plan: ${err.message}`);
  }

  let parsed;
  try {
    const cleaned = interaction.output_text.trim().replace(/^```json\s*|\s*```$/g, "");
    parsed = JSON.parse(cleaned);
  } catch {
    throw new HttpsError("internal", "Gemini's response wasn't valid JSON.");
  }

  return {
    title: parsed.title || goal,
    steps: (parsed.steps || []).map((s, i) => ({
      id: `step-${i}`,
      title: s.title || `Step ${i + 1}`,
      description: s.description || "",
      content: s.content || "",
      sourceUrl: s.sourceUrl || "",
    })),
    flashcards: (parsed.flashcards || [])
        .filter((f) => f.question && f.answer)
        .map((f, i) => ({id: `card-${i}`, question: f.question, answer: f.answer})),
    quiz: (parsed.quiz || [])
        .filter((q) => q.prompt && q.options?.length === 4 && q.answer)
        .map((q, i) => ({
          id: `quiz-${i}`,
          prompt: q.prompt,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation || "",
        })),
    sources: matched.map((m) => m.source),
  };
});

// Pulls real research papers for a page — merges two genuine sources so the
// feed isn't just the raw arXiv firehose: arXiv itself (every new preprint,
// unfiltered) and Hugging Face's Daily Papers (community-upvoted, higher
// signal). Both are real public REST APIs, no key needed.
async function fetchPapers(page) {
  const arxivRes = await fetch(
      `https://export.arxiv.org/api/query?search_query=cat:cs.LG+OR+cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=3&start=${page * 3}`,
  );
  const xml = await arxivRes.text();
  const arxivPapers = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
      .map((m) => m[1])
      .map((entry) => ({
        kind: "paper",
        source: "arXiv",
        title: (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.replace(/\s+/g, " ").trim(),
        summary: (entry.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]?.replace(/\s+/g, " ").trim(),
        url: (entry.match(/<id>([\s\S]*?)<\/id>/) || [])[1]?.trim(),
        published: (entry.match(/<published>([\s\S]*?)<\/published>/) || [])[1]?.trim(),
      }))
      .filter((p) => p.title && p.summary && p.url);

  let hfPapers = [];
  try {
    const hfRes = await fetch(`https://huggingface.co/api/daily_papers?limit=3&p=${page}`);
    const hfJson = await hfRes.json();
    hfPapers = (Array.isArray(hfJson) ? hfJson : [])
        .map((item) => ({
          kind: "paper",
          source: "HF Daily Papers",
          title: item.paper?.title,
          summary: item.paper?.summary,
          url: item.paper?.id ? `https://huggingface.co/papers/${item.paper.id}` : null,
          published: item.paper?.publishedAt,
        }))
        .filter((p) => p.title && p.summary && p.url);
  } catch {
    // Non-fatal — arXiv alone still covers the "papers" side of the feed.
  }

  return [...hfPapers, ...arxivPapers];
}

// Pulls real, currently-trending AI industry news — launches, funding,
// acquisitions, company moves — from Hacker News' official Algolia search
// API (no key needed). This is what actually catches things like an
// acquisition headline, which a research-paper-only feed never would.
async function fetchIndustryNews(page) {
  try {
    const cutoff = Math.floor(Date.now() / 1000) - 21 * 24 * 3600; // last 3 weeks
    const hnRes = await fetch(
        `https://hn.algolia.com/api/v1/search?query=AI&tags=story&typoTolerance=false` +
      `&numericFilters=points%3E30,created_at_i%3E${cutoff}&hitsPerPage=3&page=${page}`,
    );
    const hnJson = await hnRes.json();
    return (hnJson.hits || [])
        .filter((h) => h.title && h.url && h.points > 30)
        .map((h) => ({
          kind: "news",
          source: "Hacker News",
          title: h.title,
          url: h.url,
          published: h.created_at,
          points: h.points,
          comments: h.num_comments ?? 0,
          discussionUrl: `https://news.ycombinator.com/item?id=${h.objectID}`,
        }));
  } catch {
    return [];
  }
}

exports.getAiFeed = onCall({secrets: [geminiKey]}, async (request) => {
  const offset = Number(request.data?.offset) || 0;
  const page = Math.floor(offset / 6);

  const [papers, news] = await Promise.all([fetchPapers(page), fetchIndustryNews(page)]);
  const items = [...papers, ...news];
  if (items.length === 0) return {items: []};

  // Gemini explains each — papers get the full pedagogical treatment
  // (grounded strictly in the real abstract); news items get only a
  // headline-grounded note, since we only have the real title/engagement
  // numbers, not the article body, and must not invent article content.
  const ai = new GoogleGenAI({apiKey: geminiKey.value()});
  let interaction;
  try {
    interaction = await ai.interactions.create({
      model: GEMINI_MODEL,
      input:
        "Below is a numbered list of AI-related items — some are research papers (with a real abstract), " +
        "some are trending Hacker News story headlines (title only, no article text). " +
        "Respond with strict JSON only: an array of objects, same order and count as the items:\n" +
        "Paper items: {\"kind\":\"paper\",\"oneLiner\":\"...\",\"tryThis\":\"...\",\"flashQuestion\":\"...\",\"flashAnswer\":\"...\"," +
        "\"realWorldExample\":\"...\",\"significance\":\"breakthrough\"|\"update\"}\n" +
        "News items: {\"kind\":\"news\",\"whyItMatters\":\"...\",\"significance\":\"breakthrough\"|\"update\"}\n\n" +
        "For paper items — ground everything strictly in the abstract given, never add unsupported claims:\n" +
        "oneLiner: one plain-language sentence explaining what the paper actually did, no jargon.\n" +
        "tryThis: one concrete, beginner-friendly way to explore or experiment with the idea, one sentence.\n" +
        "flashQuestion: a short quiz question testing the core idea, answerable in one sentence.\n" +
        "flashAnswer: the answer, one sentence, plain language.\n" +
        "realWorldExample: one real product/system already using this kind of technique (name it only if genuinely well known).\n\n" +
        "For news items — you only have the headline and engagement numbers, NOT the article text, so do not invent " +
        "specifics the headline doesn't state:\n" +
        "whyItMatters: one sentence, plain language, explaining why a headline like this matters to someone learning AI — " +
        "paraphrase and contextualize the headline itself, do not add facts, numbers, or claims beyond what it says.\n\n" +
        "significance (both kinds): \"breakthrough\" only for a genuinely notable jump — be conservative, most items are \"update\".\n" +
        "No markdown, no extra text, JSON array only.\n\n" +
        items.map((it, i) =>
          it.kind === "paper" ?
            `${i + 1}. [PAPER] ${it.title}\n${it.summary}` :
            `${i + 1}. [NEWS] ${it.title} (${it.points} points, ${it.comments} comments on Hacker News)`,
        ).join("\n\n"),
    });
  } catch (err) {
    throw new HttpsError("unavailable", `Gemini couldn't summarize today's feed: ${err.message}`);
  }

  let explained;
  try {
    const cleaned = interaction.output_text.trim().replace(/^```json\s*|\s*```$/g, "");
    explained = JSON.parse(cleaned);
  } catch {
    explained = items.map(() => ({}));
  }

  return {
    items: items.map((it, i) => {
      const e = explained[i] || {};
      if (it.kind === "news") {
        return {
          kind: "news",
          source: it.source,
          title: it.title,
          url: it.url,
          discussionUrl: it.discussionUrl,
          published: it.published,
          points: it.points,
          comments: it.comments,
          whyItMatters: e.whyItMatters || "",
          significance: e.significance === "breakthrough" ? "breakthrough" : "update",
        };
      }
      return {
        kind: "paper",
        source: it.source,
        title: it.title,
        url: it.url,
        published: it.published,
        oneLiner: e.oneLiner || "",
        tryThis: e.tryThis || "",
        flashQuestion: e.flashQuestion || "",
        flashAnswer: e.flashAnswer || "",
        realWorldExample: e.realWorldExample || "",
        significance: e.significance === "breakthrough" ? "breakthrough" : "update",
      };
    }),
  };
});

// LLM-generated dynamic questions — the "modern alternative" to a fixed
// dataset: instead of only ever drawing from MMLU/AGIEval/hand-authored
// content, Gemini generates fresh questions for a topic on demand. Cached
// in Firestore per topic so repeat calls don't regenerate (and don't
// re-spend quota) once a topic already has enough.
exports.generateTopicQuestions = onCall({secrets: [geminiKey]}, async (request) => {
  const {topicId, topicTitle, count = 8} = request.data;
  if (!topicId || !topicTitle) {
    throw new HttpsError("invalid-argument", "topicId and topicTitle are required.");
  }

  const db = admin.firestore();
  const ref = db.collection("topicGenerated").doc(topicId);
  const existing = await ref.get();
  const existingItems = existing.exists ? existing.data().items || [] : [];
  if (existingItems.length >= count) {
    return {items: existingItems};
  }

  const ai = new GoogleGenAI({apiKey: geminiKey.value()});
  let interaction;
  try {
    interaction = await ai.interactions.create({
      model: GEMINI_MODEL,
      input:
        `Generate ${count} multiple-choice quiz questions for the AI/ML learning topic "${topicTitle}". ` +
        "Respond with strict JSON only: an array of objects " +
        "{\"prompt\": \"...\", \"options\": [\"...\",\"...\",\"...\",\"...\"], \"answer\": \"...\", \"explanation\": \"...\"}.\n" +
        "prompt: a clear question testing real understanding of this topic, not trivia.\n" +
        "options: exactly 4 plausible choices, only one correct.\n" +
        "answer: must exactly match one of the options strings.\n" +
        "explanation: one sentence explaining why the answer is correct.\n" +
        "Vary difficulty across the set — some basic, some more advanced. No markdown, no extra text, JSON array only.",
    });
  } catch (err) {
    throw new HttpsError("unavailable", `Gemini couldn't generate questions: ${err.message}`);
  }

  let generated;
  try {
    const cleaned = interaction.output_text.trim().replace(/^```json\s*|\s*```$/g, "");
    generated = JSON.parse(cleaned);
  } catch {
    throw new HttpsError("internal", "Gemini's response wasn't valid JSON.");
  }

  const items = generated
      .filter((q) => q.prompt && q.options?.length === 4 && q.answer)
      .map((q, i) => ({
        id: `gen-${topicId}-${Date.now()}-${i}`,
        prompt: q.prompt,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation || "",
        source: "Gemini-generated",
      }));

  await ref.set({topicId, items, generatedAt: new Date().toISOString()});
  return {items};
});

// An interactive AI tutor scoped to one plan step. Unlike assemblePlan (which
// must never say anything the matched source material doesn't support), a
// tutoring conversation is expected to draw on the model's own knowledge to
// explain, give worked examples, and cite real-world/production use cases —
// so this isn't RAG-grounded, just instructed to flag genuine uncertainty
// rather than state a shaky fact with confidence.
exports.tutorChat = onCall({secrets: [geminiKey]}, async (request) => {
  const {topicTitle, topicContext, previousInteractionId, message, listMode} = request.data;
  if (!topicTitle) {
    throw new HttpsError("invalid-argument", "topicTitle is required.");
  }

  const ai = new GoogleGenAI({apiKey: geminiKey.value()});

  // The Gemini API's interaction threading (previous_interaction_id) keeps
  // the full conversation server-side — no need to replay history as text.
  // Google Search grounding is enabled so real-world examples and "what's
  // happening now" answers are actually current, not just the model's
  // training-data recollection.
  const systemInstruction =
    `You are a friendly, sharp AI/ML tutor helping a learner understand "${topicTitle}". ` +
    (topicContext ? `Here's what they've already read: "${topicContext}". ` : "") +
    "Explain in plain language, use concrete worked examples, and mention real-world or production use cases " +
    "where relevant — use Google Search when it would make an answer more current or accurate, especially for " +
    "real-world examples or recent developments. Keep responses focused (roughly 100-200 words) unless asked for " +
    "more depth. If you're genuinely unsure of a fact even after searching, say so rather than stating it confidently. " +
    "No markdown headers, plain conversational text.";

  let input;
  if (listMode) {
    input = `List the key subtopics or things a learner should understand within "${topicTitle}", as a short ` +
      "numbered list (5-8 items), each with a one-sentence description.";
  } else if (message) {
    input = message;
  } else {
    input = `Open with an engaging explanation of "${topicTitle}": the core idea, a concrete worked example, ` +
      "and one real-world or production use case where this is actually used today.";
  }

  const params = {
    model: GEMINI_MODEL,
    input,
    tools: [{type: "google_search"}],
  };
  if (previousInteractionId) {
    params.previous_interaction_id = previousInteractionId;
  } else {
    params.system_instruction = systemInstruction;
  }

  let interaction;
  try {
    interaction = await ai.interactions.create(params);
  } catch (err) {
    throw new HttpsError("unavailable", `The tutor couldn't respond: ${err.message}`);
  }

  return {reply: interaction.output_text.trim(), interactionId: interaction.id};
});

// Narrates the Sandbox's actual pipeline in plain language, personalized to
// the learner's own two class names — real-time explanation of what's
// mechanically happening at each stage, not a canned generic description.
exports.explainSandboxRun = onCall({secrets: [geminiKey]}, async (request) => {
  const {classA, classB} = request.data;
  if (!classA || !classB) {
    throw new HttpsError("invalid-argument", "classA and classB are required.");
  }

  const ai = new GoogleGenAI({apiKey: geminiKey.value()});
  let interaction;
  try {
    interaction = await ai.interactions.create({
      model: GEMINI_MODEL,
      input:
        `A learner is training an image classifier to tell "${classA}" apart from "${classB}", ` +
        "using MobileNet (frozen, pretrained) as a feature extractor feeding a small trainable 2-layer classifier head. " +
        "Respond with strict JSON only: an object " +
        "{\"photos\": \"...\", \"embedding\": \"...\", \"training\": \"...\", \"prediction\": \"...\"}.\n" +
        `photos: one sentence, explain what their uploaded ${classA}/${classB} photos are about to become.\n` +
        "embedding: one sentence, explain what MobileNet is doing to each photo — turning it into numbers — using their actual class names as the example.\n" +
        "training: one sentence, explain what the small trainable classifier is learning to do with those numbers, referencing their two class names.\n" +
        "prediction: one sentence, explain what happens when they upload a new test photo, referencing their two class names.\n" +
        "Plain language, no jargon, genuinely specific to their classes — not generic. No markdown, JSON object only.",
    });
  } catch (err) {
    throw new HttpsError("unavailable", `Gemini couldn't narrate the pipeline: ${err.message}`);
  }

  try {
    const cleaned = interaction.output_text.trim().replace(/^```json\s*|\s*```$/g, "");
    return JSON.parse(cleaned);
  } catch {
    throw new HttpsError("internal", "Gemini's response wasn't valid JSON.");
  }
});
