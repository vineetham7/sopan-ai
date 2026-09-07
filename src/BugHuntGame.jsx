import { useState } from "react";
import { loadPyodideOnce } from "./pyodideLoader";
import "./BugHuntGame.css";

// Five real, common Python bugs — not toy examples. Each is verified by
// actually running the learner's code through Pyodide and comparing real
// captured stdout against the real correct output, not just "did it run
// without throwing" (a bug can run fine and just be wrong).
const PUZZLES = [
  {
    id: "off-by-one",
    title: "Off-by-one in a range",
    buggyCode: `total = 0\nfor i in range(1, 5):\n    total += i\nprint(total)`,
    hint: "The loop is supposed to add up 1 through 5. Check what range(1, 5) actually produces.",
    fixExplanation: "range(1, 5) stops before 5, giving 1,2,3,4 (sum 10). To include 5, it needs range(1, 6).",
    expectedOutput: "15",
  },
  {
    id: "mutable-default",
    title: "The shared mutable default argument",
    buggyCode: `def add_item(item, items=[]):\n    items.append(item)\n    return items\n\nprint(add_item("a"))\nprint(add_item("b"))`,
    hint: "A default argument's value is created once, the first time the function is defined — not fresh on every call.",
    fixExplanation: "items=[] is the *same list* reused across every call with no explicit items argument. Fix: default to None, and create a new list inside the function if it's None.",
    expectedOutput: "['a']\n['b']",
  },
  {
    id: "string-int-concat",
    title: "Mixing text and numbers",
    buggyCode: `age = 25\nprint("I am " + age + " years old")`,
    hint: "Python won't silently convert a number to text for you the way some languages do.",
    fixExplanation: "You can't + a string and an int directly. Fix: wrap age in str(age), or use an f-string: f\"I am {age} years old\".",
    expectedOutput: "I am 25 years old",
  },
  {
    id: "index-out-of-range",
    title: "One index too far",
    buggyCode: `fruits = ["apple", "banana", "cherry"]\nprint(fruits[3])`,
    hint: "A list with 3 items has valid indices 0, 1, and 2 — not 3.",
    fixExplanation: "fruits[3] would be the 4th item, which doesn't exist. The last real item is fruits[2] (or fruits[-1]).",
    expectedOutput: "cherry",
  },
  {
    id: "mutate-while-iterating",
    title: "Changing a list while looping over it",
    buggyCode: `numbers = [1, 2, 3, 4, 5, 6]\nfor n in numbers:\n    if n % 2 == 0:\n        numbers.remove(n)\nprint(numbers)`,
    hint: "Removing items from a list while a for-loop is walking through it makes the loop skip the next item.",
    fixExplanation: "Loop over a copy instead — numbers[:] or list(numbers) — so removing from the real list doesn't shift positions out from under the loop.",
    expectedOutput: "[1, 3, 5]",
  },
];

async function runCapturingStdout(code) {
  const py = await loadPyodideOnce();
  const wrapped =
    `import sys, io\n__sh_buf = io.StringIO()\nsys.stdout = __sh_buf\n` +
    `try:\n` +
    code.split("\n").map((l) => "    " + l).join("\n") +
    `\nexcept Exception as e:\n    __sh_buf.write(f"{type(e).__name__}: {e}")\n` +
    `sys.stdout = sys.__stdout__\n__sh_buf.getvalue()`;
  const result = await py.runPythonAsync(wrapped);
  return String(result).replace(/\n$/, "");
}

export default function BugHuntGame() {
  const [index, setIndex] = useState(0);
  const [code, setCode] = useState(PUZZLES[0].buggyCode);
  const [result, setResult] = useState(null); // { output, correct }
  const [running, setRunning] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [solved, setSolved] = useState({});

  const puzzle = PUZZLES[index];

  function pick(i) {
    setIndex(i);
    setCode(PUZZLES[i].buggyCode);
    setResult(null);
    setShowHint(false);
  }

  async function runFix() {
    setRunning(true);
    try {
      const output = await runCapturingStdout(code);
      const correct = output.trim() === puzzle.expectedOutput.trim();
      setResult({ output, correct });
      if (correct) setSolved((prev) => ({ ...prev, [puzzle.id]: true }));
    } catch (err) {
      setResult({ output: String(err), correct: false });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="bug-hunt">
      <div className="bug-hunt-picker">
        {PUZZLES.map((p, i) => (
          <button
            key={p.id}
            className={`bug-pick ${i === index ? "active" : ""} ${solved[p.id] ? "solved" : ""}`}
            onClick={() => pick(i)}
          >
            {solved[p.id] ? "✓ " : ""}{p.title}
          </button>
        ))}
      </div>

      <p className="bug-hunt-instructions">
        This code has a real bug. Edit it below, then run it — a real Python interpreter checks your fix.
      </p>

      <textarea
        className="bug-hunt-code"
        value={code}
        onChange={(e) => { setCode(e.target.value); setResult(null); }}
        rows={code.split("\n").length + 1}
        spellCheck={false}
      />

      <div className="bug-hunt-actions">
        <button className="btn btn-primary" onClick={runFix} disabled={running}>
          {running ? "Running..." : "▶ Run and check"}
        </button>
        <button className="bug-hint-btn" onClick={() => setShowHint(!showHint)}>
          {showHint ? "Hide hint" : "💡 Hint"}
        </button>
      </div>

      {showHint && <p className="bug-hunt-hint">{puzzle.hint}</p>}

      {result && (
        <div className={`bug-hunt-result ${result.correct ? "correct" : "incorrect"}`}>
          <p className="bug-hunt-output"><strong>Output:</strong> {result.output || "(nothing printed)"}</p>
          {result.correct ? (
            <p className="bug-hunt-verdict">✓ Fixed! That's the real, correct output.</p>
          ) : (
            <>
              <p className="bug-hunt-verdict">Not quite — expected: {puzzle.expectedOutput}</p>
              <p className="bug-hunt-explanation">{puzzle.fixExplanation}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
