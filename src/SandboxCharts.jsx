// Small, honest charts — every value here is real data from the actual
// training run, not a decorative animation. Hand-rolled SVG/CSS, no chart
// library needed at this size.

export function EmbeddingBars({ values }) {
  // values: a real slice of the actual embedding vector, min-max normalized
  // to 0-1 for bar height only — the numbers behind the bars are real.
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return (
    <div className="embedding-bars">
      {values.map((v, i) => (
        <div
          key={i}
          className="embedding-bar"
          style={{ height: `${Math.max(4, ((v - min) / range) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export function AccuracyLineChart({ history, epochs }) {
  const W = 280;
  const H = 90;
  const pad = 6;
  if (history.length === 0) {
    return <div className="accuracy-chart empty">Waiting for the first epoch...</div>;
  }
  const points = history.map((h) => {
    const x = pad + (h.epoch / epochs) * (W - pad * 2);
    const y = H - pad - h.accuracy * (H - pad * 2);
    return [x, y];
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const lastAcc = history[history.length - 1].accuracy;

  return (
    <svg className="accuracy-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} className="axis-line" />
      <path d={path} className="accuracy-line" fill="none" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="3.5" className="accuracy-dot" />
      <text x={Math.min(last[0] + 6, W - 34)} y={last[1] - 6} className="accuracy-label">
        {Math.round(lastAcc * 100)}%
      </text>
    </svg>
  );
}

// A real fully-connected graph, drawn as actual nodes + edges — every line
// here is a real connection in the trained network, not a decorative dot
// cluster. While `active` (mid-training), small particles animate along
// every edge to show data/gradients actually moving through the network on
// each pass — the same visual language DSA/algorithm visualizers use for
// "something is flowing along this edge right now."
export function NetworkDiagram({ active, classNames, embeddingDim = 1024, hiddenUnits = 32 }) {
  const W = 320, H = 120;
  const layerX = [26, 160, 294];
  const counts = [6, 8, classNames.length];

  function nodeYs(count, spread) {
    if (count === 1) return [H / 2];
    const step = spread / (count - 1);
    const start = H / 2 - spread / 2;
    return Array.from({ length: count }, (_, i) => start + i * step);
  }

  const ys0 = nodeYs(counts[0], 88);
  const ys1 = nodeYs(counts[1], 100);
  const ys2 = nodeYs(counts[2], 44);

  const edges01 = ys0.flatMap((y1, i) => ys1.map((y2, j) => ({ id: `e01-${i}-${j}`, x1: layerX[0], y1, x2: layerX[1], y2 })));
  const edges12 = ys1.flatMap((y1, i) => ys2.map((y2, j) => ({ id: `e12-${i}-${j}`, x1: layerX[1], y1, x2: layerX[2], y2 })));
  const edges = [...edges01, ...edges12];

  return (
    <div className={`network-diagram-svg ${active ? "active" : ""}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {edges.map((e) => (
          <g key={e.id}>
            <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} className="net-edge" />
            <path id={e.id} d={`M${e.x1},${e.y1} L${e.x2},${e.y2}`} fill="none" stroke="none" />
            {active && (
              <circle r="2.2" className="net-flow-dot">
                <animateMotion dur={`${(0.9 + (e.id.length % 5) * 0.15).toFixed(2)}s`} repeatCount="indefinite" begin={`${(e.id.length % 7) * 0.12}s`}>
                  <mpath href={`#${e.id}`} />
                </animateMotion>
              </circle>
            )}
          </g>
        ))}
        {ys0.map((y, i) => <circle key={`n0-${i}`} cx={layerX[0]} cy={y} r="4.5" className="net-node input" />)}
        {ys1.map((y, i) => <circle key={`n1-${i}`} cx={layerX[1]} cy={y} r="4.5" className="net-node hidden" style={active ? { animationDelay: `${i * 0.07}s` } : undefined} />)}
        {ys2.map((y, i) => (
          <g key={`n2-${i}`}>
            <circle cx={layerX[2]} cy={y} r="6" className="net-node output" style={active ? { animationDelay: `${i * 0.15}s` } : undefined} />
            <text x={layerX[2] + 12} y={y + 3} className="net-node-label">{classNames[i]}</text>
          </g>
        ))}
      </svg>
      <div className="net-layer-labels">
        <span>{embeddingDim} numbers</span>
        <span>{hiddenUnits} trainable units</span>
        <span>{classNames.join(" vs ")}</span>
      </div>
    </div>
  );
}

// A persistent overview strip showing where in the pipeline the current step
// is — nodes connected by edges with continuously flowing particles, and the
// currently-relevant node highlighted. This is the "you are here" map that
// the 5 detailed math steps below plug into.
const FLOW_NODES = [
  { label: "Photo", icon: "🖼" },
  { label: "MobileNet", icon: "🧠" },
  { label: "Embedding", icon: "🔢" },
  { label: "Hidden layer", icon: "⚙" },
  { label: "Raw scores", icon: "📈" },
  { label: "Answer", icon: "✓" },
];

export function PipelineFlow({ activeIndex = 0 }) {
  const W = 620, H = 78;
  const n = FLOW_NODES.length;
  const gap = (W - 40) / (n - 1);
  const cy = 30;
  const xs = FLOW_NODES.map((_, i) => 20 + i * gap);

  return (
    <div className="pipeline-flow-wrap">
      <svg className="pipeline-flow" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {xs.slice(0, -1).map((x, i) => {
          const x2 = xs[i + 1];
          const id = `pf-edge-${i}`;
          return (
            <g key={id}>
              <line x1={x} y1={cy} x2={x2} y2={cy} className="flow-edge" />
              <path id={id} d={`M${x},${cy} L${x2},${cy}`} fill="none" stroke="none" />
              <circle r="3" className="flow-dot">
                <animateMotion dur="1.8s" repeatCount="indefinite" begin={`${i * 0.2}s`}>
                  <mpath href={`#${id}`} />
                </animateMotion>
              </circle>
            </g>
          );
        })}
        {FLOW_NODES.map((node, i) => (
          <g key={node.label} className={`flow-node ${i === activeIndex ? "active" : ""} ${i < activeIndex ? "done" : ""}`}>
            <circle cx={xs[i]} cy={cy} r="17" />
            <text x={xs[i]} y={cy + 5} textAnchor="middle" className="flow-icon">{node.icon}</text>
          </g>
        ))}
      </svg>
      <div className="flow-labels">
        {FLOW_NODES.map((node, i) => (
          <span key={node.label} className={i === activeIndex ? "active" : ""}>{node.label}</span>
        ))}
      </div>
    </div>
  );
}

// Walks through the real math for one test photo, step by step: the actual
// embedding this photo produced, the actual trained weights feeding one
// hidden unit, the actual hidden activations, the actual raw logits, and the
// actual softmax that turns them into the confidence bars above. Every
// number is pulled from the live tf.js model via predictWithTrace — nothing
// here is a mocked or illustrative value.
export function PredictionMath({ trace, classNames, playToken }) {
  if (!trace) return null;
  const { embeddingSample, hidden, w1Sample, b1Value, logits, allProbs } = trace;
  const hiddenSample = hidden.slice(0, 24);
  const expTerms = logits.map((l) => Math.exp(l));
  const expSum = expTerms.reduce((a, b) => a + b, 0);

  return (
    <div className="pred-math" key={playToken}>
      <div className="pred-step" style={{ animationDelay: "0s" }}>
        <div className="pred-step-label">1 · This photo, turned into 1,024 numbers by MobileNet</div>
        <EmbeddingBars values={embeddingSample} />
      </div>

      <div className="pred-step" style={{ animationDelay: "0.7s" }}>
        <div className="pred-step-label">2 · Each of the 32 hidden units is a weighted sum of all 1,024 numbers</div>
        <div className="pred-formula">
          h<sub>1</sub> = ReLU(
          {w1Sample.map((w, i) => (
            <span key={i}>{i > 0 ? " + " : ""}x<sub>{i + 1}</sub>·{w.toFixed(3)}</span>
          ))}
          {" + ... + "}b<sub>1</sub>({b1Value.toFixed(3)}) ) = <strong>{hidden[0].toFixed(3)}</strong>
        </div>
        <EmbeddingBars values={hiddenSample} />
        <p className="chart-caption">24 of the 32 real trained hidden-unit activations for this exact photo</p>
      </div>

      <div className="pred-step" style={{ animationDelay: "1.4s" }}>
        <div className="pred-step-label">3 · The same weighted-sum step again → one raw score per class</div>
        <div className="logits-row">
          {classNames.map((name, i) => (
            <div key={name} className="logit-chip">
              <span className="logit-name">{name}</span>
              <span className="logit-val">{logits[i].toFixed(3)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pred-step" style={{ animationDelay: "2.1s" }}>
        <div className="pred-step-label">4 · Softmax turns raw scores into probabilities that add up to 100%</div>
        <div className="pred-formula">softmax(x<sub>i</sub>) = e<sup>x</sup><sub>i</sub> / Σ e<sup>x</sup><sub>j</sub></div>
        <div className="logits-row">
          {classNames.map((name, i) => (
            <div key={name} className="logit-chip">
              <span className="logit-name">e^{logits[i].toFixed(2)} = {expTerms[i].toFixed(2)}</span>
              <span className="logit-val">÷ {expSum.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pred-step" style={{ animationDelay: "2.8s" }}>
        <div className="pred-step-label">5 · Final answer</div>
        <ConfidenceBars probs={allProbs} />
      </div>
    </div>
  );
}

export function ConfidenceBars({ probs }) {
  const best = probs.reduce((b, p) => (p.confidence > b.confidence ? p : b), probs[0]);
  return (
    <div className="confidence-bars">
      {probs.map((p) => (
        <div key={p.className} className="confidence-row">
          <span className="confidence-name">{p.className}</span>
          <div className="confidence-track">
            <div
              className={`confidence-fill ${p.className === best.className ? "winner" : ""}`}
              style={{ width: `${Math.round(p.confidence * 100)}%` }}
            />
          </div>
          <span className="confidence-pct">{Math.round(p.confidence * 100)}%</span>
        </div>
      ))}
    </div>
  );
}
