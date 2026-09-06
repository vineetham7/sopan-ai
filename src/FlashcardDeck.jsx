import { useState } from "react";
import "./FlashcardDeck.css";

export default function FlashcardDeck({ cards }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!cards || cards.length === 0) return null;
  const card = cards[index];

  function go(delta) {
    setFlipped(false);
    setIndex((i) => (i + delta + cards.length) % cards.length);
  }

  return (
    <div className="flashcard-deck">
      <div className="deck-meta">
        <span>Card {index + 1} of {cards.length}</span>
        <span className="deck-hint">{flipped ? "tap to see the question" : "tap to reveal the answer"}</span>
      </div>

      <button
        type="button"
        className={`flip-card ${flipped ? "is-flipped" : ""}`}
        onClick={() => setFlipped(!flipped)}
        aria-label={flipped ? "Show question" : "Show answer"}
      >
        <div className="flip-card-inner">
          <div className="flip-face flip-front">
            <span className="flip-label">Question</span>
            <p>{card.question}</p>
          </div>
          <div className="flip-face flip-back">
            <span className="flip-label">Answer</span>
            <p>{card.answer}</p>
          </div>
        </div>
      </button>

      <div className="deck-nav">
        <button className="deck-nav-btn" onClick={() => go(-1)} disabled={cards.length < 2}>← Prev</button>
        <div className="deck-dots">
          {cards.map((_, i) => (
            <span key={i} className={i === index ? "dot active" : "dot"} />
          ))}
        </div>
        <button className="deck-nav-btn" onClick={() => go(1)} disabled={cards.length < 2}>Next →</button>
      </div>
    </div>
  );
}
