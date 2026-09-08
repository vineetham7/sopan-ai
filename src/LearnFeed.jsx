import { useEffect, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { toggleBookmark, getBookmarks } from "./bookmarkStore";
import StepTutorChat from "./StepTutorChat";
import "./LearnFeed.css";

const getAiFeed = httpsCallable(functions, "getAiFeed");

function FlashCard({ question, answer }) {
  const [flipped, setFlipped] = useState(false);
  if (!question) return null;
  return (
    <button className="flashcard" onClick={() => setFlipped(!flipped)}>
      <div className="flashcard-label">{flipped ? "Answer — tap to flip back" : "Flashcard — tap to reveal"}</div>
      <div className="flashcard-text">{flipped ? answer : question}</div>
    </button>
  );
}

// Routes "Try now" to whichever real, working tab actually matches the
// article — not a fake link. ML/training content goes to the Sandbox
// (the only tab that trains a real model); everything else goes to
// Practice, where any Python idea from the article can actually be run.
function routeForArticle(item) {
  const text = `${item.title} ${item.oneLiner}`.toLowerCase();
  const trainingWords = ["train", "classifier", "neural network", "image", "model", "vision", "cnn"];
  return trainingWords.some((w) => text.includes(w)) ? "sandbox" : "practice";
}

// Real, curated sources for staying current beyond what this feed can pull
// live — most of these (leaderboards, paid digests, community hubs) don't
// have a free public API, so rather than fake an integration, they're
// listed as honest outbound links.
const EXPLORE_SOURCES = [
  {
    group: "Benchmark & model tracking",
    links: [
      { name: "LMSYS Chatbot Arena", url: "https://lmarena.ai/", note: "Crowdsourced human Elo rankings across coding, reasoning, hard prompts" },
      { name: "Hugging Face Open LLM Leaderboard", url: "https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard", note: "Open-source models on MMLU, GSM8K, MATH, IFEval" },
      { name: "Artificial Analysis", url: "https://artificialanalysis.ai/", note: "Quality vs. speed vs. price across frontier + open-weight models" },
      { name: "SEAL Leaderboards (Scale AI)", url: "https://scale.com/leaderboard", note: "Expert-annotated private evals, contamination-resistant" },
    ],
  },
  {
    group: "Research & daily aggregators",
    links: [
      { name: "Hugging Face Daily Papers", url: "https://huggingface.co/papers", note: "Top community-upvoted papers daily, with discussion + code" },
      { name: "arXiv (cs.AI, cs.CL, cs.CV)", url: "https://arxiv.org/list/cs.AI/recent", note: "Primary source for frontier research preprints" },
      { name: "AlphaSignal", url: "https://alphasignal.ai/", note: "Weekly top breakthroughs, algorithmically filtered" },
      { name: "The Batch (DeepLearning.AI)", url: "https://www.deeplearning.ai/the-batch/", note: "Weekly briefing on launches, tools, research" },
    ],
  },
  {
    group: "Direct industry & community",
    links: [
      { name: "OpenAI News", url: "https://openai.com/news/", note: "First-party announcements" },
      { name: "Anthropic News", url: "https://www.anthropic.com/news", note: "First-party announcements" },
      { name: "Google DeepMind Blog", url: "https://deepmind.google/discover/blog/", note: "First-party announcements" },
      { name: "Meta AI Blog", url: "https://ai.meta.com/blog/", note: "First-party announcements" },
      { name: "Hacker News", url: "https://news.ycombinator.com/", note: "Where this feed's industry-news cards come from" },
      { name: "Papers with Code", url: "https://paperswithcode.com/", note: "Papers linked directly to their implementations" },
      { name: "r/MachineLearning", url: "https://www.reddit.com/r/MachineLearning/", note: "Practitioner research discussion" },
      { name: "r/LocalLLaMA", url: "https://www.reddit.com/r/LocalLLaMA/", note: "Open-weight models, hardware, quantization" },
    ],
  },
];

function ExploreSources() {
  const [open, setOpen] = useState(false);
  return (
    <div className="explore-sources">
      <button className="explore-toggle" onClick={() => setOpen(!open)}>
        {open ? "Hide" : "Want more sources to follow yourself?"} {open ? "▲" : "▾"}
      </button>
      {open && (
        <div className="explore-groups">
          {EXPLORE_SOURCES.map((g) => (
            <div key={g.group} className="explore-group">
              <div className="explore-group-title">{g.group}</div>
              {g.links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="explore-link">
                  <span className="explore-link-name">{l.name}</span>
                  <span className="explore-link-note">{l.note}</span>
                </a>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LearnFeed({ onNavigate, uid }) {
  const [status, setStatus] = useState("loading"); // loading | error | done
  const [items, setItems] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // all | paper | news | bookmarked
  const [bookmarks, setBookmarks] = useState([]);
  const [chatMounted, setChatMounted] = useState({});
  const [chatOpen, setChatOpen] = useState({});
  const loadedOnce = useRef(false);

  function openChat(url) {
    setChatMounted((prev) => ({ ...prev, [url]: true }));
    setChatOpen((prev) => ({ ...prev, [url]: true }));
  }

  function closeChat(url) {
    setChatOpen((prev) => ({ ...prev, [url]: false }));
  }

  useEffect(() => {
    if (uid) getBookmarks(uid).then(setBookmarks);
  }, [uid]);

  async function handleToggleBookmark(item) {
    const updated = await toggleBookmark(uid, item);
    setBookmarks(updated);
  }

  function isBookmarked(url) {
    return bookmarks.some((b) => b.url === url);
  }

  async function load(nextOffset = 0, append = false) {
    if (append) setLoadingMore(true);
    else setStatus("loading");
    try {
      const res = await getAiFeed({ offset: nextOffset });
      setItems((prev) => (append ? [...prev, ...res.data.items] : res.data.items));
      setOffset(nextOffset);
      setStatus("done");
    } catch (err) {
      setError(err.message ?? String(err));
      if (!append) setStatus("error");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    // Ref guard, not just relying on this running once — StrictMode's dev-mode
    // double effect invocation would otherwise fire two real getAiFeed calls
    // (arXiv + HN + Gemini) on every mount, doubling Gemini quota use for
    // nothing (same class of bug found and fixed in the Sandbox's narration effect).
    if (loadedOnce.current) return;
    loadedOnce.current = true;
    load(0, false);
  }, []);

  const openItem = items.find((i) => i.url === openId) || bookmarks.find((i) => i.url === openId);
  const visibleItems = filter === "all" ? items
    : filter === "bookmarked" ? bookmarks
    : items.filter((i) => i.kind === filter);

  if (openItem) {
    const isNews = openItem.kind === "news";
    return (
      <div className="card learn-feed insta-detail">
        <div className="detail-top-row">
          <button className="back-btn" onClick={() => setOpenId(null)}>← Back to feed</button>
          <button className="bookmark-btn" onClick={() => handleToggleBookmark(openItem)} aria-label="Toggle bookmark">
            {isBookmarked(openItem.url) ? "★ Bookmarked" : "☆ Bookmark"}
          </button>
        </div>
        <div className="feed-meta">
          <span className="source-badge">{isNews ? "🗞" : "📄"} {openItem.source}</span>
          <span className={`badge ${openItem.significance}`}>{openItem.significance === "breakthrough" ? "🔥 Breakthrough" : "Update"}</span>
        </div>
        <h3 className="detail-title">{openItem.title}</h3>

        {isNews ? (
          <>
            <p className="one-liner">{openItem.whyItMatters}</p>
            <p className="hn-stats">{openItem.points} points · {openItem.comments} comments on Hacker News</p>
            <a className="read-original" href={openItem.url} target="_blank" rel="noreferrer">Read the original article →</a>
            <a className="read-original" href={openItem.discussionUrl} target="_blank" rel="noreferrer">See the Hacker News discussion →</a>
          </>
        ) : (
          <>
            <p className="one-liner">{openItem.oneLiner}</p>
            {openItem.realWorldExample && (
              <div className="real-world"><span className="label">Already out there —</span>{openItem.realWorldExample}</div>
            )}
            {openItem.tryThis && (
              <div className="try-this"><span className="label">Try this —</span>{openItem.tryThis}</div>
            )}
            <FlashCard question={openItem.flashQuestion} answer={openItem.flashAnswer} />
            <a className="read-original" href={openItem.url} target="_blank" rel="noreferrer">Read the original paper →</a>
            <button className="btn btn-primary btn-block try-now" onClick={() => onNavigate?.(routeForArticle(openItem))}>
              Try it now →
            </button>
          </>
        )}

        <button className="chat-tutor-btn" onClick={() => openChat(openItem.url)}>
          💬 Ask the tutor about this
        </button>
        {chatMounted[openItem.url] && (
          <StepTutorChat
            topicTitle={openItem.title}
            topicContext={isNews ? openItem.whyItMatters : openItem.oneLiner}
            open={!!chatOpen[openItem.url]}
            onClose={() => closeChat(openItem.url)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="learn-feed">
      {status === "loading" && <div className="card"><p className="state-msg">Pulling today's papers and industry news...</p></div>}
      {status === "error" && <div className="card"><p className="state-msg error">Couldn't load the feed: {error}</p></div>}

      {status === "done" && (
        <div className="feed-filters">
          {[["all", "All"], ["paper", "Research"], ["news", "Industry news"], ["bookmarked", `Bookmarked${bookmarks.length ? ` (${bookmarks.length})` : ""}`]].map(([id, label]) => (
            <button key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
      )}

      {status === "done" && filter === "bookmarked" && bookmarks.length === 0 && (
        <div className="card"><p className="state-msg">No bookmarks yet — tap the ☆ on any card to save it here.</p></div>
      )}

      {status === "done" && visibleItems.length > 0 && (
        <div className="kanban-grid">
          {visibleItems.map((item) => (
            <button key={item.url} className="kanban-card" onClick={() => setOpenId(item.url)}>
              <div className="feed-meta">
                <span className="source-badge">{item.kind === "news" ? "🗞" : "📄"} {item.source}</span>
                <span className="kanban-card-actions">
                  <span
                    className="bookmark-toggle"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); handleToggleBookmark(item); }}
                    aria-label="Toggle bookmark"
                  >
                    {isBookmarked(item.url) ? "★" : "☆"}
                  </span>
                  <span className={`badge ${item.significance}`}>{item.significance === "breakthrough" ? "🔥" : ""}</span>
                </span>
              </div>
              <div className="kanban-title">{item.title}</div>
              <p className="kanban-summary">{item.kind === "news" ? item.whyItMatters : item.oneLiner}</p>
              <span className="kanban-open">{item.kind === "news" ? `${item.points} pts on HN →` : "Open →"}</span>
            </button>
          ))}
        </div>
      )}

      {status === "done" && filter !== "bookmarked" && (
        <button className="btn btn-primary btn-block load-more" onClick={() => load(offset + 6, true)} disabled={loadingMore}>
          {loadingMore ? "Loading more..." : "Load more"}
        </button>
      )}

      {status === "done" && <ExploreSources />}
    </div>
  );
}
