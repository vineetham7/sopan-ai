import { motion, MotionConfig } from "framer-motion"
import Logo from "./Logo"
import "./Home.css"

const ICONS = {
  diagnostic: <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />,
  path: <path d="M9 20l-5.5-3V6L9 3l6 3 5.5-3v11L15 17l-6-3-5.5 3M9 3v14M15 6v14" />,
  practice: <path d="m8 6-6 6 6 6M16 6l6 6-6 6M13 4l-2 16" />,
  plan: <path d="M12 2v4M12 18v4M4.9 4.9l2.9 2.9M16.2 16.2l2.9 2.9M2 12h4M18 12h4M4.9 19.1l2.9-2.9M16.2 7.8l2.9-2.9" />,
  learn: <path d="M4 4h13a2 2 0 0 1 2 2v14l-3-2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 4h9M6 11h9M6 14h5" />,
  sandbox: <path d="M9 3h6M10 3v5.5L4.5 18a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 8.5V3M8 15h8" />,
}

const CARDS = [
  {
    tab: "Diagnostic",
    tabId: "diagnostic",
    icon: ICONS.diagnostic,
    highlight: "32 real questions · 8 topics",
    body: "Skip the guesswork — a real placement test that adapts to your answers and shows exactly where to start.",
  },
  {
    tab: "Sandbox",
    tabId: "sandbox",
    icon: ICONS.sandbox,
    highlight: "Train a real model in seconds",
    body: "Ever wondered how AI actually tells things apart? Train one yourself, live, and watch the real math behind each guess.",
  },
  {
    tab: "Path",
    tabId: "path",
    icon: ICONS.path,
    highlight: "Spaced repetition, built in",
    body: "Your skill map, what's due for review today, and every plan you've saved — one screen, not five.",
  },
  {
    tab: "Practice",
    tabId: "practice",
    icon: ICONS.practice,
    highlight: "A real Python interpreter",
    body: "Write code and actually run it in your browser, or fix real bugs and test if the fix works — live!",
  },
  {
    tab: "Plan",
    tabId: "plan",
    icon: ICONS.plan,
    highlight: "Grounded, not guessed",
    body: "Describe a goal and get a study plan grounded in real material — flashcards, a quiz, and an AI tutor on every step.",
  },
  {
    tab: "Insta",
    tabId: "learn",
    icon: ICONS.learn,
    highlight: "Dive into today's AI world",
    body: "Real papers and real industry news, each explained in plain language first — the code is there if you want it, not if you don't.",
  },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}
const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.2, 0.7, 0.3, 1] } },
}

export default function Home({ onNavigate, dueCount = 0 }) {
  return (
    <MotionConfig reducedMotion="user">
    <motion.div
      className="home"
      initial="hidden"
      animate="show"
      variants={container}
    >
      <motion.section className="home-hero" variants={rise}>
        {/* Positioning lives on this plain wrapper, not the motion.div below —
            framer-motion's `animate` takes over the `transform` CSS property
            entirely once it manages any transform-adjacent value (scale here),
            silently replacing translateX(-50%) and breaking centering. */}
        <div className="home-hero-orb-wrap" aria-hidden="true">
          <motion.div
            className="home-hero-orb"
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="home-hero-mark"><Logo size={40} /></div>
        <span className="home-hero-eyebrow">Built for Patchamomma 2026</span>
        <h1 className="home-hero-title">Your Gateway to AI&nbsp;&amp; Machine Learning</h1>
        <p className="home-hero-sub">
          Test what you actually know, learn exactly what's next, and train a real model
          along the way — free, and built to be usable by anyone.
        </p>
        <p className="home-hero-motto">Learn. Test. Build. Repeat.</p>
        <button className="home-cta" onClick={() => onNavigate("diagnostic")}>
          Take the diagnostic test →
        </button>
      </motion.section>

      <motion.div className="home-cards" variants={container}>
        {CARDS.map((c) => (
          <motion.button
            key={c.tab}
            className="home-card"
            variants={rise}
            whileHover={{ y: -3 }}
            onClick={() => onNavigate(c.tabId)}
          >
            <svg className="home-card-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              {c.icon}
            </svg>
            <span className="home-card-tab">
              {c.tab}
              {c.tabId === "path" && dueCount > 0 && (
                <span className="home-card-badge">{dueCount} due</span>
              )}
            </span>
            <span className="home-card-highlight">{c.highlight}</span>
            <span className="home-card-intro">{c.body}</span>
            <span className="home-card-go">Open →</span>
          </motion.button>
        ))}
      </motion.div>

      <motion.section className="home-why" variants={rise}>
        <h2>Why this exists</h2>
        <p>
          Built for <strong>Patchamomma</strong>, a Google Cloud–backed initiative (with the
          Code Vipassana community) that empowers women professionals to learn and ship
          production-grade apps on real infrastructure, not just slides. This project applies
          that same philosophy directly: learning should be sustainable, hands-on, and
          genuinely accessible to everyone — not gated by cost or background.
        </p>
      </motion.section>
    </motion.div>
    </MotionConfig>
  )
}
