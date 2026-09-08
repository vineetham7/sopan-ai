import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { getNotes, saveNotes } from "./notesStore"
import "./NotesPanel.css"

const SAVE_DELAY = 800
const MIN_WIDTH = 260
const MAX_WIDTH = 700

export default function NotesPanel({ uid, open, onClose }) {
  const [text, setText] = useState("")
  const [status, setStatus] = useState("loading") // loading | idle | saving | saved
  const [suppressed, setSuppressed] = useState(false) // temporarily hidden while the AI Tutor panel is open
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem("sopan-notes-width"))
    return saved >= MIN_WIDTH && saved <= MAX_WIDTH ? saved : 300
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
    getNotes(uid).then((t) => {
      setText(t)
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

  function handleChange(e) {
    const value = e.target.value
    setText(value)
    setStatus("saving")
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await saveNotes(uid, value)
      setStatus("saved")
    }, SAVE_DELAY)
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
      <textarea
        className="notes-textarea"
        value={text}
        onChange={handleChange}
        placeholder="Jot anything down while you study — this sticks around across every tab."
        disabled={status === "loading"}
      />
    </div>,
    document.body,
  )
}
