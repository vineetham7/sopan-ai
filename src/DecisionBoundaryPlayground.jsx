import { useState } from "react";
import * as tf from "@tensorflow/tfjs";
import "./DecisionBoundaryPlayground.css";

const EPOCHS = 80;
const GRID = 24; // 24x24 real predictions rendered as the boundary background
const SIZE = 300;

// Same 2-class idea as the Image Classifier, but you place the examples
// directly instead of uploading photos — so you can watch the actual
// decision boundary appear and move as it trains, not just a confidence
// number at the end.
export default function DecisionBoundaryPlayground() {
  const [classA, setClassA] = useState("Red");
  const [classB, setClassB] = useState("Blue");
  const [activeClass, setActiveClass] = useState("A");
  const [points, setPoints] = useState([]); // { x, y, label: 0|1 } normalized 0-1
  const [status, setStatus] = useState("idle"); // idle | training | done | error
  const [epoch, setEpoch] = useState(0);
  const [model, setModel] = useState(null);
  const [grid, setGrid] = useState(null); // Float32Array of GRID*GRID predictions
  const [error, setError] = useState(null);

  const countA = points.filter((p) => p.label === 0).length;
  const countB = points.filter((p) => p.label === 1).length;
  const canTrain = countA >= 3 && countB >= 3;

  function addPoint(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPoints((p) => [...p, { x, y, label: activeClass === "A" ? 0 : 1 }]);
    setModel(null);
    setGrid(null);
    setStatus("idle");
  }

  function clearPoints() {
    setPoints([]);
    setModel(null);
    setGrid(null);
    setStatus("idle");
  }

  async function train() {
    setStatus("training");
    setError(null);
    model?.dispose();

    const m = tf.sequential();
    m.add(tf.layers.dense({ units: 8, activation: "relu", inputShape: [2] }));
    m.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
    m.compile({ optimizer: tf.train.adam(0.05), loss: "binaryCrossentropy" });

    const xs = tf.tensor2d(points.map((p) => [p.x, p.y]));
    const ys = tf.tensor2d(points.map((p) => [p.label]));

    try {
      await m.fit(xs, ys, {
        epochs: EPOCHS,
        callbacks: { onEpochEnd: (e) => setEpoch(e + 1) },
      });
      setModel(m);

      // Real predictions across a grid — this literally is the decision
      // boundary, not a drawn approximation of one.
      const cells = [];
      for (let gy = 0; gy < GRID; gy++) {
        for (let gx = 0; gx < GRID; gx++) {
          cells.push([(gx + 0.5) / GRID, (gy + 0.5) / GRID]);
        }
      }
      const gridInput = tf.tensor2d(cells);
      const preds = m.predict(gridInput);
      const values = await preds.data();
      gridInput.dispose();
      preds.dispose();
      xs.dispose();
      ys.dispose();
      setGrid(values);
      setStatus("done");
    } catch (err) {
      setError(String(err));
      setStatus("error");
      xs.dispose();
      ys.dispose();
    }
  }

  return (
    <div className="card dbp">
      <div className="dbp-classes">
        <button
          className={activeClass === "A" ? "dbp-class-btn a active" : "dbp-class-btn a"}
          onClick={() => setActiveClass("A")}
        >
          <input value={classA} onChange={(e) => setClassA(e.target.value)} onClick={(e) => e.stopPropagation()} />
          <span className="dbp-count">{countA} points</span>
        </button>
        <button
          className={activeClass === "B" ? "dbp-class-btn b active" : "dbp-class-btn b"}
          onClick={() => setActiveClass("B")}
        >
          <input value={classB} onChange={(e) => setClassB(e.target.value)} onClick={(e) => e.stopPropagation()} />
          <span className="dbp-count">{countB} points</span>
        </button>
      </div>
      <p className="dbp-hint">
        Selected: <strong>{activeClass === "A" ? classA : classB}</strong> — click the board below to place a point.
      </p>

      <div className="dbp-board" onClick={addPoint}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="dbp-svg">
          {grid && Array.from({ length: GRID * GRID }, (_, i) => {
            const gx = i % GRID, gy = Math.floor(i / GRID);
            const v = grid[i]; // 0 = classA, 1 = classB
            const cell = SIZE / GRID;
            return (
              <rect
                key={i}
                x={gx * cell}
                y={gy * cell}
                width={cell + 0.5}
                height={cell + 0.5}
                className={v > 0.5 ? "dbp-cell b" : "dbp-cell a"}
                opacity={Math.abs(v - 0.5) * 0.9}
              />
            );
          })}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x * SIZE}
              cy={p.y * SIZE}
              r="6"
              className={p.label === 0 ? "dbp-point a" : "dbp-point b"}
            />
          ))}
        </svg>
      </div>

      <div className="dbp-actions">
        <button className="btn btn-primary" onClick={train} disabled={!canTrain || status === "training"}>
          {status === "training" ? `Training... epoch ${epoch}/${EPOCHS}` : status === "done" ? "Train again" : "Train your model"}
        </button>
        <button className="dbp-clear" onClick={clearPoints} disabled={points.length === 0}>Clear board</button>
      </div>

      {!canTrain && (
        <p className="np-hint">Need at least 3 points per class ({countA}/3 {classA}, {countB}/3 {classB}).</p>
      )}
      {status === "error" && <p className="state-msg error">Training failed: {error}</p>}
      {status === "done" && (
        <p className="np-hint">
          The tinted regions are real predictions from the trained model across a {GRID}×{GRID} grid — not a drawn
          approximation of a boundary.
        </p>
      )}
    </div>
  );
}
