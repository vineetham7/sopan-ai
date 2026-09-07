import { useState } from "react";
import { loadPyodideOnce } from "./pyodideLoader";
import "./CodeBlock.css";

export default function CodeBlock({ starterCode }) {
  const [code, setCode] = useState(starterCode);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    try {
      const py = await loadPyodideOnce();
      const result = await py.runPythonAsync(code);
      setOutput(String(result ?? ""));
    } catch (err) {
      setOutput(String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="code-block">
      <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={6} />
      <button className="btn btn-primary btn-block" onClick={run} disabled={running}>
        {running ? "Running..." : "▶ Run in-browser (Pyodide, free)"}
      </button>
      <pre>{output}</pre>
    </div>
  );
}
