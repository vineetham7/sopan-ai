// The 0 → expert AI/ML path. Order matters — index+1 is the diagnostic's
// "level", and each topic's only prerequisite is the one before it.
export const TOPICS = [
  { id: "python-basics", title: "Python Basics" },
  { id: "data-math", title: "Data & Math for ML" },
  { id: "ml-foundations", title: "Core ML Concepts" },
  { id: "regression-gd", title: "Regression & Gradient Descent" },
  { id: "neural-nets", title: "Neural Network Basics" },
  { id: "deep-learning", title: "Deep Learning Practice" },
  { id: "transformers", title: "Transformers & Attention" },
  { id: "llms-applied", title: "Applied LLMs & RAG" },
];

export function topicIdAtLevel(level) {
  return TOPICS[level - 1]?.id;
}
