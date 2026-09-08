import { motion } from "framer-motion"
import Logo from "./Logo"
import { STEPS } from "./tourSteps"
import "./Home.css"

// WelcomeTour's per-tab copy is the source of truth for what each tab does —
// reused here rather than re-written, just mapped to the real tab ids.
const TAB_ID = {
  Diagnostic: "diagnostic",
  Path: "path",
  Practice: "practice",
  Plan: "plan",
  Insta: "learn",
  Sandbox: "sandbox",
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}
const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.2, 0.7, 0.3, 1] } },
}

export default function Home({ onNavigate }) {
  return (
    <motion.div
      className="home"
      initial="hidden"
      animate="show"
      variants={container}
    >
      <motion.section className="home-hero" variants={rise}>
        <div className="home-hero-mark"><Logo size={40} /></div>
        <span className="home-hero-eyebrow">Built for Patchamomma 2026</span>
        <h1 className="home-hero-title">Learn what&apos;s next, not what&apos;s fixed.</h1>
        <p className="home-hero-sub">
          A real diagnostic, a curriculum grounded in real material, and a live sandbox
          to actually train a model — free, and built to be usable by anyone.
        </p>
        <button className="home-cta" onClick={() => onNavigate("diagnostic")}>
          Take the diagnostic test →
        </button>
      </motion.section>

      <motion.div className="home-cards" variants={container}>
        {STEPS.map((s) => (
          <motion.button
            key={s.tab}
            className="home-card"
            variants={rise}
            onClick={() => onNavigate(TAB_ID[s.tab])}
          >
            <span className="home-card-tab">{s.tab}</span>
            <span className="home-card-intro">{s.intro}</span>
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
  )
}
