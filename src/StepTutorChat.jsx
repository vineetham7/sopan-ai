import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import "./StepTutorChat.css";

const tutorChat = httpsCallable(functions, "tutorChat");

export default function StepTutorChat({ topicTitle, topicContext, open, onClose }) {
  const [messages, setMessages] = useState([]); // {role: 'user'|'ai', text}
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("loading"); // loading | idle | sending | error
  const [error, setError] = useState(null);
  const interactionId = useRef(null);
  const bottomRef = useRef(null);
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    tutorChat({ topicTitle, topicContext })
      .then((res) => {
        interactionId.current = res.data.interactionId;
        setMessages([{ role: "ai", text: res.data.reply }]);
        setStatus("idle");
      })
      .catch((err) => {
        setError(err.message ?? String(err));
        setStatus("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  async function ask(text, { listMode = false } = {}) {
    if (status === "sending") return;
    if (!listMode) setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setStatus("sending");
    try {
      const res = await tutorChat({
        topicTitle,
        topicContext,
        previousInteractionId: interactionId.current,
        message: text,
        listMode,
      });
      interactionId.current = res.data.interactionId;
      setMessages((prev) => [...prev, { role: "ai", text: res.data.reply }]);
      setStatus("idle");
    } catch (err) {
      setError(err.message ?? String(err));
      setStatus("error");
    }
  }

  function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    ask(text);
  }

  // Hidden, not unmounted — closing must not lose the conversation. The
  // component stays alive in the tree (messages + interactionId survive)
  // and reopening just makes it visible again, same thread continues.
  if (!open) return null;

  return createPortal(
    <div className="tutor-modal-overlay">
      <div className="tutor-modal">
        <div className="tutor-modal-head">
          <div>
            <span className="tutor-modal-eyebrow">AI Tutor</span>
            <h4>{topicTitle}</h4>
          </div>
          <button className="tutor-close" onClick={onClose} aria-label="Close chat">✕</button>
        </div>

        <div className="tutor-chat-log">
          {messages.map((m, i) => (
            <div key={i} className={`tutor-msg ${m.role}`}>
              <span className="tutor-msg-label">{m.role === "ai" ? "Tutor" : "You"}</span>
              <p>{m.text}</p>
            </div>
          ))}
          {status === "loading" && <p className="tutor-status">The tutor is preparing an explanation...</p>}
          {status === "sending" && <p className="tutor-status">Thinking...</p>}
          {status === "error" && <p className="tutor-status error">Couldn't reach the tutor: {error}</p>}
          <div ref={bottomRef} />
        </div>

        <div className="tutor-quick-actions">
          <button onClick={() => ask(null, { listMode: true })} disabled={status === "loading" || status === "sending"}>
            📋 List key subtopics
          </button>
          <button onClick={() => ask("Give me a concrete real-world example of this in production.")} disabled={status === "loading" || status === "sending"}>
            🌍 Real-world example
          </button>
          <button onClick={() => ask("Explain that again, more simply, like I'm new to this.")} disabled={status === "loading" || status === "sending"}>
            🔎 Simplify that
          </button>
        </div>

        <form className="tutor-chat-input" onSubmit={send}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"Ask anything about " + topicTitle + "..."}
            disabled={status === "loading"}
          />
          <button className="btn btn-primary" type="submit" disabled={status === "loading" || status === "sending" || !input.trim()}>
            Ask
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
