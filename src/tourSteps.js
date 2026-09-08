// Shared between WelcomeTour (the step-by-step walkthrough) and Home (the
// landing page's feature cards) so the per-tab copy is written once.
export const STEPS = [
  {
    tab: "Diagnostic",
    intro: "Start here — find out what you actually know, topic by topic.",
    points: [
      "32 real questions — 4 per topic, across all 8 topics",
      "Mixed from real MMLU/AGIEval benchmark questions and Gemini-generated ones",
      "Pass a topic and it's marked mastered right away — no waiting through ones you already know",
      "\"End test now\" lets you finish early any time; what you've completed still counts",
    ],
  },
  {
    tab: "Path",
    intro: "Your skill map and where saved plans live.",
    points: [
      "Every topic shows locked / unlocked / mastered",
      "Self-assessment chips: Confident, Shaky, Needs revision",
      "Spaced repetition — a banner tells you exactly what's due for review",
      "\"Take the deep check\" re-tests a topic with 10 fresh questions",
      "Saved plans from the Plan tab show up here too, fully interactive",
    ],
  },
  {
    tab: "Practice",
    intro: "Real code, running for real.",
    points: [
      "Write and run real Python, compiled to WebAssembly, right in your browser",
      "Spot the Bug — 5 real Python bugs, checked by actually running your fix",
    ],
  },
  {
    tab: "Plan",
    intro: "Build a study plan grounded in real material.",
    points: [
      "Pick a topic or type your own goal",
      "A cited plan built from real source material, not invented",
      "Auto-generated flashcards and a quiz for every plan",
      "An AI Tutor chat on every step — ask anything, get real answers",
      "A \"try this next\" suggestion points you at the next real topic",
    ],
  },
  {
    tab: "Insta",
    intro: "Stay current, for real.",
    points: [
      "Real arXiv papers and Hugging Face Daily Papers",
      "Real trending industry news from Hacker News — launches, funding, acquisitions",
      "Filter by Research, Industry news, or your Bookmarks",
      "Bookmark anything to come back to later",
      "16 curated links if you want to follow more sources yourself",
    ],
  },
  {
    tab: "Sandbox",
    intro: "Train a real model, watch the real math.",
    points: [
      "Train an image classifier on your own photos, live, in your browser",
      "Watch the network actually learn, animated in real time",
      "See the literal math behind a prediction, step by step",
      "An honest warning if your sample is too small to really trust",
    ],
  },
];
