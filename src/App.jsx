import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from './useAuth'
import { ensureSkillGraphSeeded } from './ensureSkillGraph'
import Diagnostic from './DiagnosticQuiz'
import PlanAssembly from './PlanAssembly'
import CodeBlock from './CodeBlock'
import BugHuntGame from './BugHuntGame'
import SkillMap from './SkillMap'
import PlanTracker from './PlanTracker'
import LearnFeed from './LearnFeed'
import SandboxModes from './SandboxModes'
import { applyFullDiagnosticResult } from './applyFullDiagnosticResult'
import { isDue } from './sm2'
import WelcomeTour from './WelcomeTour'
import Logo from './Logo'
import Home from './Home'
import SignInGate from './SignInGate'
import NotesPanel from './NotesPanel'
import './App.css'

function shouldShowTour() {
  try {
    return !localStorage.getItem('sopan-tour-seen')
  } catch {
    return false
  }
}

const TABS = [
  { id: 'diagnostic', label: 'Diagnostic' },
  { id: 'path', label: 'Path' },
  { id: 'practice', label: 'Practice' },
  { id: 'plan', label: 'Plan' },
  { id: 'learn', label: 'Insta' },
  { id: 'sandbox', label: 'Sandbox' },
]

const VALID_TABS = ['home', ...TABS.map((t) => t.id)]

function getInitialTab() {
  const h = window.location.hash.slice(1)
  return VALID_TABS.includes(h) ? h : 'home'
}

function getInitialTheme() {
  const saved = localStorage.getItem('sopan-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialFlag(key) {
  return localStorage.getItem(key) === 'true'
}

function App() {
  const { user, loading: authLoading, isAnonymous, upgradeWithGoogle, upgradeError } = useAuth()
  const [tab, setTab] = useState(getInitialTab)
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([getInitialTab()]))
  const [showSignInGate, setShowSignInGate] = useState(true)
  const [notesOpen, setNotesOpen] = useState(false)
  const [skillNodes, setSkillNodes] = useState([])
  const [theme, setTheme] = useState(getInitialTheme)
  const [dyslexiaFont, setDyslexiaFont] = useState(() => getInitialFlag('sopan-dyslexia'))
  const [colorblind, setColorblind] = useState(() => getInitialFlag('sopan-colorblind'))
  const [showTour, setShowTour] = useState(shouldShowTour)
  const [tutorOffset, setTutorOffset] = useState(0)

  // The AI Tutor panel docks over the right edge — without this, content
  // there (e.g. Path's "Your plans" column) sits directly underneath it.
  // Shift the page left by exactly its current width instead — but only
  // when the window is wide enough to still have a usable amount of room
  // left over; below that, pushing the page would wreck the layout worse
  // than the panel just overlaying it, so leave it overlaying.
  useEffect(() => {
    function onTutor(e) {
      const hasRoom = window.innerWidth - e.detail.width > 640
      setTutorOffset(e.detail.open && hasRoom ? e.detail.width : 0)
    }
    window.addEventListener('sopan:tutor-panel', onTutor)
    return () => window.removeEventListener('sopan:tutor-panel', onTutor)
  }, [])

  useEffect(() => {
    if (!user) return
    let unsub
    ensureSkillGraphSeeded(user.uid).then(() => {
      unsub = onSnapshot(collection(db, 'users', user.uid, 'skillGraph'), (snap) => {
        setSkillNodes(snap.docs.map((d) => d.data()))
      })
    })
    return () => unsub?.()
  }, [user])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('sopan-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-dyslexia', String(dyslexiaFont))
    localStorage.setItem('sopan-dyslexia', String(dyslexiaFont))
  }, [dyslexiaFont])

  useEffect(() => {
    document.documentElement.setAttribute('data-colorblind', String(colorblind))
    localStorage.setItem('sopan-colorblind', String(colorblind))
  }, [colorblind])

  // Every tab section stays mounted once first visited (see visitedTabs
  // below), so the browser Back/Forward buttons need their own signal for
  // which one should be showing — plain useState alone never touches the
  // URL, so Back previously looked like it "reset to home" instead of
  // restoring the tab you came from.
  useEffect(() => {
    window.history.replaceState({ tab }, '', `#${tab}`)
    function onPopState(e) {
      const id = e.state?.tab || 'home'
      setVisitedTabs((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
      setTab(id)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function goToTab(id) {
    setVisitedTabs((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
    if (tab !== id) window.history.pushState({ tab: id }, '', `#${id}`)
    setTab(id)
  }

  const mastered = skillNodes.filter((n) => n.status === 'mastered').length
  const total = skillNodes.length
  const masteryPct = total > 0 ? Math.round((mastered / total) * 100) : 0
  const dueNodes = skillNodes.filter(isDue)

  if (authLoading || !user) {
    return (
      <div className="app">
        <div className="auth-loading">Signing you in...</div>
      </div>
    )
  }

  return (
    <div className="app" style={{ marginRight: tutorOffset }}>
      {showTour && <WelcomeTour onDone={() => setShowTour(false)} />}
      {showSignInGate && isAnonymous && (
        <SignInGate
          onSignIn={upgradeWithGoogle}
          onSkip={() => setShowSignInGate(false)}
          error={upgradeError}
        />
      )}
      <NotesPanel uid={user.uid} open={notesOpen} onClose={() => setNotesOpen(false)} />
      <header className="site-header">
        <div className="site-header-inner">
          <div className="brand-row">
            <button className="brand-logo-btn" onClick={() => goToTab('home')} aria-label="Go to home">
              <Logo size={30} />
              <span className="brand-text">
                <h1>Sopan AI</h1>
                <span className="brand-byline">Learn. Test. Build. Repeat.</span>
              </span>
            </button>
            <nav className="site-nav">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={tab === t.id ? 'active' : ''}
                  onClick={() => goToTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            <div className="header-actions">
              <div className="toolbar">
                <button
                  className={dyslexiaFont ? 'toolbar-btn active' : 'toolbar-btn'}
                  onClick={() => setDyslexiaFont(!dyslexiaFont)}
                  aria-pressed={dyslexiaFont}
                  aria-label="Toggle dyslexia-friendly font"
                  title="Dyslexia-friendly font"
                >
                  Aa
                </button>
                <button
                  className={colorblind ? 'toolbar-btn active' : 'toolbar-btn'}
                  onClick={() => setColorblind(!colorblind)}
                  aria-pressed={colorblind}
                  aria-label="Toggle colorblind-safe colors"
                  title="Colorblind-safe colors"
                >
                  ◐
                </button>
                <button
                  className={notesOpen ? 'toolbar-btn active' : 'toolbar-btn'}
                  onClick={() => setNotesOpen(!notesOpen)}
                  aria-pressed={notesOpen}
                  aria-label="Toggle notes panel"
                  title="My Notes"
                >
                  <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true">
                    <path d="M3 1.5A1.5 1.5 0 0 0 1.5 3v10A1.5 1.5 0 0 0 3 14.5h7.5a.5.5 0 0 0 .35-.15l3.5-3.5a.5.5 0 0 0 .15-.35V3A1.5 1.5 0 0 0 13 1.5H3Zm7 11.9V11a.5.5 0 0 1 .5-.5h2.4L10 13.4ZM3 2.5h10a.5.5 0 0 1 .5.5v7h-3A1.5 1.5 0 0 0 9 11.5v3H3a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Zm1 3a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H4Zm0 2.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1H4Z" />
                  </svg>
                </button>
                <button
                  className="toolbar-btn"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? '☀' : '☾'}
                </button>
                <a
                  className="toolbar-btn"
                  href="https://github.com/vineetham7/sopan-ai"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="View source on GitHub"
                  title="View source on GitHub"
                >
                  <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="header-sub-row">
            <p className="tagline">Learn what's next, not what's fixed</p>
            {isAnonymous ? (
              <button className="save-progress" onClick={upgradeWithGoogle}>
                <svg viewBox="0 0 18 18" width="15" height="15" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z" />
                  <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z" />
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
                </svg>
                Save your progress
              </button>
            ) : (
              <p className="signed-in-as">Signed in as {user.displayName || user.email}</p>
            )}
            {upgradeError && <p className="upgrade-error">{upgradeError}</p>}
          </div>

          <div className="stat-row">
            <div className="stat">
              <div className="v">{masteryPct}%</div>
              <div className="l">Mastery</div>
            </div>
            <div className="stat">
              <div className="v">{mastered}/{total}</div>
              <div className="l">Nodes</div>
            </div>
            <button className="stat stat-clickable" onClick={() => setShowTour(true)}>
              <div className="v">↺</div>
              <div className="l">Walkthrough</div>
            </button>
          </div>
        </div>
      </header>

      <main className="site-main"><div className="site-main-inner">
        {/* Every section, once first visited, stays mounted (hidden via the
            `hidden` attribute rather than unmounted) so switching tabs never
            loses in-progress state — a running quiz, Insta's loaded feed and
            open article, Sandbox training, an open tutor chat. */}
        {visitedTabs.has('home') && (
          <section hidden={tab !== 'home'}>
            <Home onNavigate={goToTab} />
          </section>
        )}

        {visitedTabs.has('diagnostic') && (
          <section hidden={tab !== 'diagnostic'}>
            <div className="centered-panel">
              <div className="panel-head">
                <h2>Where do you stand?</h2>
                <p>A real 32-question placement test — 4 questions per topic, Python basics to applied LLMs. No early stopping.</p>
              </div>
              <div className="card">
                <Diagnostic onComplete={(results) => applyFullDiagnosticResult(user.uid, results)} />
              </div>
            </div>
          </section>
        )}

        {visitedTabs.has('path') && (
          <section hidden={tab !== 'path'}>
            {dueNodes.length > 0 && (
              <div className="due-banner">
                <span className="due-banner-icon">⏰</span>
                <span>
                  <strong>{dueNodes.length} topic{dueNodes.length === 1 ? '' : 's'} due for review</strong>
                  {' — '}{dueNodes.map((n) => n.title).join(', ')}
                </span>
              </div>
            )}
            <div className="two-col">
              <div>
                <div className="panel-head">
                  <h2>Your prerequisite map</h2>
                  <p>Status comes from your diagnostic. Tell us how each topic actually feels.</p>
                </div>
                <div className="card">
                  <SkillMap uid={user.uid} nodes={skillNodes} />
                </div>
              </div>

              <div>
                <div className="panel-head">
                  <h2>Your plans</h2>
                  <p>Saved from the Plan tab — track them here alongside your skill map.</p>
                </div>
                <div className="card">
                  <PlanTracker uid={user.uid} />
                </div>
              </div>
            </div>
          </section>
        )}

        {visitedTabs.has('practice') && (
          <section hidden={tab !== 'practice'}>
            <div className="two-col">
              <div>
                <div className="panel-head">
                  <h2>Run it yourself</h2>
                  <p>Real Python, compiled to WebAssembly, free and in-browser.</p>
                </div>
                <div className="card">
                  <CodeBlock starterCode={'print("hello from python")\n1 + 1'} />
                </div>
              </div>

              <div>
                <div className="panel-head">
                  <h2>Spot the bug</h2>
                  <p>Five real, common Python bugs. Fix the code, then run it — a real interpreter checks whether your fix actually works.</p>
                </div>
                <div className="card">
                  <BugHuntGame />
                </div>
              </div>
            </div>
          </section>
        )}

        {visitedTabs.has('plan') && (
          <section hidden={tab !== 'plan'}>
            <div className="centered-panel">
              <div className="panel-head">
                <h2>Build a plan</h2>
                <p>Pick a topic or describe a goal — grounded only in real, cited material. Save it to track in the Path tab.</p>
              </div>
              <div className="card">
                <PlanAssembly uid={user.uid} />
              </div>
            </div>
          </section>
        )}

        {visitedTabs.has('learn') && (
          <section hidden={tab !== 'learn'}>
            <div className="panel-head">
              <h2>Insta</h2>
              <p>Stay current on AI — real papers as cards, tap one, then try it yourself.</p>
            </div>
            <LearnFeed onNavigate={goToTab} uid={user.uid} />
          </section>
        )}

        {visitedTabs.has('sandbox') && (
          <section hidden={tab !== 'sandbox'}>
            <div className="panel-head">
              <h2>Live ML Sandbox</h2>
              <p>Four ways to train a real model, entirely in your browser.</p>
            </div>
            <SandboxModes />
          </section>
        )}
      </div></main>

      <footer className="about-footer">
        <div className="about-footer-inner">
          <span className="about-footer-id">
            <span className="about-footer-brand">
              <Logo size={18} />
              Sopan AI
            </span>
            <span className="about-footer-tagline">Built for Patchamomma 2026 · Vineetha Muppala</span>
          </span>
          <span className="about-footer-links">
            <a
              className="about-footer-icon"
              href="https://www.linkedin.com/in/vineetha-muppala-525133245/"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              title="LinkedIn"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
                <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
              </svg>
            </a>
            <a
              className="about-footer-icon"
              href="https://github.com/vineetham7/sopan-ai"
              target="_blank"
              rel="noreferrer"
              aria-label="Source on GitHub"
              title="Source on GitHub"
            >
              <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
            </a>
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App
