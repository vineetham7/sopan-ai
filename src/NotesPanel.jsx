import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { getNotes, saveNotes } from "./notesStore"
import "./NotesPanel.css"

const SAVE_DELAY = 800
const MIN_WIDTH = 280
const MAX_WIDTH = 760
const TWO_COL_WIDTH = 480

function newCard() {
  return { id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title: "", text: "" }
}

export default function NotesPanel({ uid, open, onClose }) {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState("loading") // loading | idle | saving | saved
  const [suppressed, setSuppressed] = useState(false) // temporarily hidden while the AI Tutor panel is open
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem("sopan-notes-width"))
    return saved >= MIN_WIDTH && saved <= MAX_WIDTH ? saved : 320
  })
  const loadedOnce = useRef(false)
  const saveTimer = useRef(null)
  const dragState = useRef(null)

  useEffect(() => {
    // Both panels dock the same right edge — while the AI Tutor is open,
    // step out of its way rather than overlapping it.
    function onTutor(e) {
      setSuppressed(e.detail.open)
    }
    window.addEventListener("sopan:tutor-panel", onTutor)
    return () => window.removeEventListener("sopan:tutor-panel", onTutor)
  }, [])

  useEffect(() => {
    if (!open || loadedOnce.current) return
    loadedOnce.current = true
    getNotes(uid).then((loaded) => {
      setItems(loaded.length ? loaded : [newCard()])
      setStatus("idle")
    })
  }, [open, uid])

  useEffect(() => {
    function onMove(e) {
      if (!dragState.current) return
      const delta = dragState.current.startX - e.clientX
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragState.current.startWidth + delta)))
    }
    function onUp() {
      if (!dragState.current) return
      dragState.current = null
      setWidth((w) => {
        localStorage.setItem("sopan-notes-width", String(w))
        return w
      })
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [])

  function startDrag(e) {
    dragState.current = { startX: e.clientX, startWidth: width }
  }

  function persist(next) {
    setItems(next)
    setStatus("saving")
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await saveNotes(uid, next)
      setStatus("saved")
    }, SAVE_DELAY)
  }

  function updateCard(id, field, value) {
    persist(items.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }

  function addCard() {
    persist([...items, newCard()])
  }

  function removeCard(id) {
    const next = items.filter((c) => c.id !== id)
    persist(next.length ? next : [newCard()])
  }

  if (!open || suppressed) return null

  return createPortal(
    <div className="notes-panel" style={{ width }}>
      <div
        className="notes-resize-handle"
        onMouseDown={startDrag}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize notes panel"
      />
      <div className="notes-panel-head">
        <span className="notes-pin" aria-hidden="true">📌</span>
        <h4>My Notes</h4>
        <span className="notes-status">
          {status === "loading" ? "Loading…" : status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
        </span>
        <button className="notes-close" onClick={onClose} aria-label="Close notes">✕</button>
      </div>

      <div className={width >= TWO_COL_WIDTH ? "notes-cards two-col" : "notes-cards"}>
        {status === "loading" ? (
          <p className="notes-loading">Loading your notes…</p>
        ) : (
          items.map((card) => (
            <div className="notes-card" key={card.id}>
              <div className="notes-card-head">
                <input
                  className="notes-card-title"
                  value={card.title}
                  onChange={(e) => updateCard(card.id, "title", e.target.value)}
                  placeholder="Untitled"
                />
                {items.length > 1 && (
                  <button className="notes-card-remove" onClick={() => removeCard(card.id)} aria-label="Delete note">✕</button>
                )}
              </div>
              <textarea
                className="notes-card-body"
                value={card.text}
                onChange={(e) => updateCard(card.id, "text", e.target.value)}
                placeholder="Jot anything down while you study..."
              />
            </div>
          ))
        )}
      </div>

      {status !== "loading" && (
        <button className="notes-add" onClick={addCard}>+ New note</button>
      )}
    </div>,
    document.body,
  )
}
