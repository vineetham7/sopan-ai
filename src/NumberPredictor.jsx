import { useState } from "react";
import * as tf from "@tensorflow/tfjs";
import { LossLineChart } from "./SandboxCharts";
import "./NumberPredictor.css";

const EPOCHS = 60;

// A real linear regression, trained live in the browser on whatever (x, y)
// pairs the learner types in — genuinely different math from the Image
// Classifier's multi-class softmax next door, and it needs no uploaded
// data at all.
export default function NumberPredictor() {
  const [points, setPoints] = useState([]);
  const [xInput, setXInput] = useState("");
  const [yInput, setYInput] = useState("");
  const [xLabel, setXLabel] = useState("Hours studied");
  const [yLabel, setYLabel] = useState("Score");
  const [status, setStatus] = useState("idle"); // idle | training | done | error
  const [epochInfo, setEpochInfo] = useState({ epoch: 0, loss: 0 });
  const [history, setHistory] = useState([]);
  const [model, setModel] = useState(null);
  const [range, setRange] = useState(null); // { xMin, xMax, yMin, yMax } used to train
  const [predictX, setPredictX] = useState("");
  const [predictY, setPredictY] = useState(null);
  const [error, setError] = useState(null);

  const canTrain = points.length >= 3;

  function addPoint(e) {
    e.preventDefault();
    const x = Number(xInput);
    const y = Number(yInput);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    setPoints((p) => [...p, { x, y }]);
    setXInput("");
    setYInput("");
    setModel(null);
    setStatus("idle");
  }

  function removePoint(i) {
    setPoints((p) => p.filter((_, idx) => idx !== i));
    setModel(null);
    setStatus("idle");
  }

  async function train() {
    setStatus("training");
    setError(null);
    setHistory([]);
    setPredictY(null);
    model?.dispose();

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    const r = { xMin, xMax, yMin, yMax, xRange, yRange };
    setRange(r);

    // Real min-max normalization — points can be any scale ("hours" 1-10,
    // "score" 0-100) and training directly on raw values that different in
    // scale is a real source of unstable/NaN loss, not a hypothetical one.
    const normX = xs.map((x) => (x - xMin) / xRange);
    const normY = ys.map((y) => (y - yMin) / yRange);

    const m = tf.sequential();
    m.add(tf.layers.dense({ units: 1, inputShape: [1] }));
    m.compile({ optimizer: tf.train.adam(0.1), loss: "meanSquaredError" });

    const xTensor = tf.tensor2d(normX, [normX.length, 1]);
    const yTensor = tf.tensor2d(normY, [normY.length, 1]);

    try {
      await m.fit(xTensor, yTensor, {
        epochs: EPOCHS,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            setEpochInfo({ epoch: epoch + 1, loss: logs.loss });
            setHistory((h) => [...h, { epoch: epoch + 1, loss: logs.loss }]);
          },
        },
      });
      setModel(m);
      setStatus("done");
    } catch (err) {
      setError(String(err));
      setStatus("error");
    } finally {
      xTensor.dispose();
      yTensor.dispose();
    }
  }

  function predict(e) {
    e.preventDefault();
    if (!model || !range) return;
    const x = Number(predictX);
    if (!Number.isFinite(x)) return;
    const normX = (x - range.xMin) / range.xRange;
    const input = tf.tensor2d([normX], [1, 1]);
    const out = model.predict(input);
    const normY = out.dataSync()[0];
    input.dispose();
    out.dispose();
    setPredictY(normY * range.yRange + range.yMin);
  }

  // Real fitted-line endpoints, computed from the trained model at the data's
  // own min/max x — not illustrative, this is what the model actually predicts.
  let fitLine = null;
  if (model && range) {
    const xs2 = tf.tensor2d([0, 1], [2, 1]);
    const out2 = model.predict(xs2);
    const [yAt0, yAt1] = out2.dataSync();
    xs2.dispose();
    out2.dispose();
    fitLine = [
      { x: range.xMin, y: yAt0 * range.yRange + range.yMin },
      { x: range.xMax, y: yAt1 * range.yRange + range.yMin },
    ];
  }

  return (
    <div className="card number-predictor">
      <div className="np-labels">
        <input className="np-label-input" value={xLabel} onChange={(e) => setXLabel(e.target.value)} placeholder="x label" />
        <span>→</span>
        <input className="np-label-input" value={yLabel} onChange={(e) => setYLabel(e.target.value)} placeholder="y label" />
      </div>

      <form className="np-add-row" onSubmit={addPoint}>
        <input type="number" step="any" value={xInput} onChange={(e) => setXInput(e.target.value)} placeholder={xLabel} required />
        <input type="number" step="any" value={yInput} onChange={(e) => setYInput(e.target.value)} placeholder={yLabel} required />
        <button className="btn btn-primary" type="submit">+ Add point</button>
      </form>

      {points.length > 0 && (
        <ScatterChart points={points} fitLine={fitLine} xLabel={xLabel} yLabel={yLabel} predictPoint={predictY != null ? { x: Number(predictX), y: predictY } : null} />
      )}

      {points.length > 0 && (
        <ul className="np-points">
          {points.map((p, i) => (
            <li key={i}>
              <span>{xLabel}: {p.x} · {yLabel}: {p.y}</span>
              <button onClick={() => removePoint(i)} aria-label="Remove point">✕</button>
            </li>
          ))}
        </ul>
      )}

      <p className="np-hint">
        {canTrain ? `${points.length} points — ready to train.` : `Add at least 3 points (${points.length}/3) to train a real model.`}
      </p>

      <button className="btn btn-primary btn-block" onClick={train} disabled={!canTrain || status === "training"}>
        {status === "training" ? `Training... epoch ${epochInfo.epoch}/${EPOCHS}` : status === "done" ? "Train again" : "Train your model"}
      </button>

      {status === "error" && <p className="state-msg error">Training failed: {error}</p>}

      {history.length > 0 && (
        <div className="np-loss">
          <LossLineChart history={history} epochs={EPOCHS} />
          <p className="chart-caption">Real loss (mean squared error) each epoch — lower is better</p>
        </div>
      )}

      {status === "done" && (
        <form className="np-predict" onSubmit={predict}>
          <label>Predict {yLabel} for a new {xLabel}:</label>
          <div className="np-predict-row">
            <input type="number" step="any" value={predictX} onChange={(e) => setPredictX(e.target.value)} placeholder={xLabel} required />
            <button className="btn btn-primary" type="submit">Predict</button>
          </div>
          {predictY != null && (
            <p className="np-predict-result">{yLabel} ≈ <strong>{predictY.toFixed(2)}</strong></p>
          )}
        </form>
      )}
    </div>
  );
}

function ScatterChart({ points, fitLine, xLabel, yLabel, predictPoint }) {
  const W = 320, H = 180, pad = 28;
  const allX = points.map((p) => p.x).concat(fitLine ? fitLine.map((p) => p.x) : []).concat(predictPoint ? [predictPoint.x] : []);
  const allY = points.map((p) => p.y).concat(fitLine ? fitLine.map((p) => p.y) : []).concat(predictPoint ? [predictPoint.y] : []);
  const xMin = Math.min(...allX), xMax = Math.max(...allX);
  const yMin = Math.min(...allY), yMax = Math.max(...allY);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const sx = (x) => pad + ((x - xMin) / xRange) * (W - pad * 2);
  const sy = (y) => H - pad - ((y - yMin) / yRange) * (H - pad * 2);

  return (
    <svg className="np-scatter" viewBox={`0 0 ${W} ${H}`}>
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} className="axis-line" />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} className="axis-line" />
      <text x={W / 2} y={H - 6} textAnchor="middle" className="np-axis-label">{xLabel}</text>
      <text x={10} y={H / 2} textAnchor="middle" className="np-axis-label" transform={`rotate(-90 10 ${H / 2})`}>{yLabel}</text>
      {fitLine && (
        <line x1={sx(fitLine[0].x)} y1={sy(fitLine[0].y)} x2={sx(fitLine[1].x)} y2={sy(fitLine[1].y)} className="np-fit-line" />
      )}
      {points.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="4" className="np-point" />
      ))}
      {predictPoint && (
        <circle cx={sx(predictPoint.x)} cy={sy(predictPoint.y)} r="5.5" className="np-predict-point" />
      )}
    </svg>
  );
}
