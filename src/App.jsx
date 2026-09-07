import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from './useAuth'
import { ensureSkillGraphSeeded } from './ensureSkillGraph'
import Diagnostic from './DiagnosticQuiz'
import PlanAssembly from './PlanAssembly'
import CodeBlock from './CodeBlock'
import SkillMap from './SkillMap'
import PlanTracker from './PlanTracker'
import LearnFeed from './LearnFeed'
import MLSandbox from './MLSandbox'
import { applyFullDiagnosticResult } from './applyFullDiagnosticResult'
import { isDue } from './sm2'
import './App.css'

const TABS = [
  { id: 'diagnostic', label: 'Diagnostic' },
  { id: 'path', label: 'Path' },
  { id: 'practice', label: 'Practice' },
  { id: 'plan', label: 'Plan' },
  { id: 'learn', label: 'Insta' },
  { id: 'sandbox', label: 'Sandbox' },
]

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
  const [tab, setTab] = useState('diagnostic')
  const [skillNodes, setSkillNodes] = useState([])
  const [theme, setTheme] = useState(getInitialTheme)
  const [dyslexiaFont, setDyslexiaFont] = useState(() => getInitialFlag('sopan-dyslexia'))
  const [colorblind, setColorblind] = useState(() => getInitialFlag('sopan-colorblind'))

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
    <div className="app">
      <header className="site-header">
        <div className="site-header-inner">
          <div className="brand-row">
            <h1>Sopan AI</h1>
            <nav className="site-nav">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={tab === t.id ? 'active' : ''}
                  onClick={() => setTab(t.id)}
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
                  {'</>'}
                </a>
              </div>
            </div>
          </div>

          <div className="header-sub-row">
            <p className="tagline">Learn what's next, not what's fixed</p>
            {isAnonymous ? (
              <button className="save-progress" onClick={upgradeWithGoogle}>
                Save your progress — sign in with Google
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
          </div>
        </div>
      </header>

      <main className="site-main"><div className="site-main-inner">
        {tab === 'diagnostic' && (
          <section>
            <div className="panel-head">
              <h2>Where do you stand?</h2>
              <p>A real 32-question placement test — 4 questions per topic, Python basics to applied LLMs. No early stopping.</p>
            </div>
            <div className="card">
              <Diagnostic onComplete={(results) => applyFullDiagnosticResult(user.uid, results)} />
            </div>
          </section>
        )}

        {tab === 'path' && (
          <section>
            {dueNodes.length > 0 && (
              <div className="due-banner">
                <span className="due-banner-icon">⏰</span>
                <span>
                  <strong>{dueNodes.length} topic{dueNodes.length === 1 ? '' : 's'} due for review</strong>
                  {' — '}{dueNodes.map((n) => n.title).join(', ')}
                </span>
              </div>
            )}
            <div className="panel-head">
              <h2>Your prerequisite map</h2>
              <p>Status comes from your diagnostic. Tell us how each topic actually feels.</p>
            </div>
            <div className="card">
              <SkillMap uid={user.uid} nodes={skillNodes} />
            </div>

            <div className="panel-head" style={{ marginTop: 24 }}>
              <h2>Your plans</h2>
              <p>Saved from the Plan tab — track them here alongside your skill map.</p>
            </div>
            <div className="card">
              <PlanTracker uid={user.uid} />
            </div>
          </section>
        )}

        {tab === 'practice' && (
          <section>
            <div className="panel-head">
              <h2>Run it yourself</h2>
              <p>Real Python, compiled to WebAssembly, free and in-browser.</p>
            </div>
            <div className="card">
              <CodeBlock starterCode={'print("hello from python")\n1 + 1'} />
            </div>
          </section>
        )}

        {tab === 'plan' && (
          <section>
            <div className="panel-head">
              <h2>Build a plan</h2>
              <p>Pick a topic or describe a goal — grounded only in real, cited material. Save it to track in the Path tab.</p>
            </div>
            <div className="card">
              <PlanAssembly uid={user.uid} />
            </div>
          </section>
        )}

        {tab === 'learn' && (
          <section>
            <div className="panel-head">
              <h2>Insta</h2>
              <p>Stay current on AI — real papers as cards, tap one, then try it yourself.</p>
            </div>
            <LearnFeed onNavigate={setTab} uid={user.uid} />
          </section>
        )}

        {tab === 'sandbox' && (
          <section>
            <div className="panel-head">
              <h2>Live ML Sandbox</h2>
              <p>Train a real image classifier, entirely in your browser, in seconds.</p>
            </div>
            <MLSandbox />
          </section>
        )}
      </div></main>
    </div>
  )
}

export default App
