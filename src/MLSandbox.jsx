import { useEffect, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { loadMobilenet, embedImage, trainClassifier, predictWithTrace, fileToImage } from "./tfClassifier";
import { EmbeddingBars, AccuracyLineChart, NetworkDiagram, PredictionMath, PipelineFlow } from "./SandboxCharts";
import "./MLSandbox.css";
import "./SandboxCharts.css";

const EPOCHS = 20;
const explainSandboxRun = httpsCallable(functions, "explainSandboxRun");

function useClassSlot(defaultName) {
  const [name, setName] = useState(defaultName);
  const [photos, setPhotos] = useState([]); // { url, embedding }
  return { name, setName, photos, setPhotos };
}

export default function MLSandbox() {
  const [mobilenet, setMobilenet] = useState(null);
  const [mnStatus, setMnStatus] = useState("loading");
  const classA = useClassSlot("Cats");
  const classB = useClassSlot("Dogs");
  const [trainStatus, setTrainStatus] = useState("idle");
  const [epochInfo, setEpochInfo] = useState({ epoch: 0, accuracy: 0 });
  const [epochHistory, setEpochHistory] = useState([]);
  const [trainMs, setTrainMs] = useState(null);
  const [trained, setTrained] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [replayToken, setReplayToken] = useState(0);
  const [flowIndex, setFlowIndex] = useState(0);
  const [error, setError] = useState(null);
  const [narration, setNarration] = useState(null);
  const [narrationStatus, setNarrationStatus] = useState("idle"); // idle | loading | done | error
  const narrationFired = useRef(false);
  const fileInputA = useRef(null);
  const fileInputB = useRef(null);
  const testInputRef = useRef(null);

  useEffect(() => {
    loadMobilenet()
      .then((m) => { setMobilenet(m); setMnStatus("ready"); })
      .catch((err) => { setError(String(err)); setMnStatus("error"); });
  }, []);

  async function addPhotos(slot, files) {
    if (!mobilenet || !files.length) return;
    const newPhotos = [];
    for (const file of files) {
      const img = await fileToImage(file);
      const embedding = await embedImage(mobilenet, img);
      newPhotos.push({ url: img.src, embedding });
    }
    slot.setPhotos((prev) => [...prev, ...newPhotos]);
  }

  const totalPhotos = classA.photos.length + classB.photos.length;
  const canTrain = classA.photos.length >= 2 && classB.photos.length >= 2;
  const sampleEmbedding = (classA.photos[0] || classB.photos[0])?.embedding?.slice(0, 24);

  useEffect(() => {
    // A state-only guard isn't enough: React StrictMode's dev-mode double
    // effect invocation re-runs this before the first setNarrationStatus
    // commit is visible, so the "idle" check alone let two real Gemini calls
    // fire (confirmed in emulator logs — two concurrent requests, whichever
    // finished last silently overwrote the other's result). A ref persists
    // across that double-invoke, unlike state read in the same tick.
    if (!canTrain || narrationFired.current) return;
    narrationFired.current = true;
    setNarrationStatus("loading");
    explainSandboxRun({ classA: classA.name, classB: classB.name })
      .then((res) => { setNarration(res.data); setNarrationStatus("done"); })
      .catch((err) => { setError(String(err)); setNarrationStatus("error"); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canTrain]);

  async function train() {
    setTrainStatus("training");
    setError(null);
    setTestResult(null);
    setEpochHistory([]);
    setEpochInfo({ epoch: 0, accuracy: 0 });
    const start = performance.now();
    try {
      const { model, classNames } = await trainClassifier({
        embeddingsByClass: {
          [classA.name]: classA.photos.map((p) => p.embedding),
          [classB.name]: classB.photos.map((p) => p.embedding),
        },
        epochs: EPOCHS,
        onEpochEnd: (epoch, logs) => {
          const acc = logs.acc ?? logs.accuracy ?? 0;
          setEpochInfo({ epoch: epoch + 1, accuracy: acc });
          setEpochHistory((h) => [...h, { epoch: epoch + 1, accuracy: acc }]);
        },
      });
      setTrained({ model, classNames });
      setTrainMs(Math.round(performance.now() - start));
      setTrainStatus("done");
    } catch (err) {
      setError(String(err));
      setTrainStatus("error");
    }
  }

  useEffect(() => {
    if (!testResult) return;
    const steps = [[0, 0], [150, 1], [300, 2], [1000, 3], [1700, 4], [2400, 4], [3100, 5]];
    const timers = steps.map(([delay, idx]) => setTimeout(() => setFlowIndex(idx), delay));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayToken, testResult]);

  async function testPhoto(file) {
    if (!trained || !mobilenet) return;
    const img = await fileToImage(file);
    const embedding = await embedImage(mobilenet, img);
    const trace = await predictWithTrace(trained.model, trained.classNames, embedding);
    setTestResult({ url: img.src, ...trace });
    setReplayToken((t) => t + 1);
  }

  if (mnStatus === "loading") {
    return <div className="card ml-sandbox"><p className="state-msg">Loading MobileNet (once, cached after)...</p></div>;
  }
  if (mnStatus === "error") {
    return <div className="card ml-sandbox"><p className="state-msg error">Couldn't load MobileNet: {error}</p></div>;
  }

  return (
    <div className="ml-sandbox journey">
      {/* Stage 1 — upload */}
      <div className="card journey-stage">
        <div className="stage-num">1</div>
        <h3 className="stage-title">Give it two things to tell apart</h3>
        {[classA, classB].map((slot, i) => (
          <div className="class-slot" key={i}>
            <input className="class-name" value={slot.name} onChange={(e) => slot.setName(e.target.value)} />
            <div className="thumbs">
              {slot.photos.map((p, idx) => <img key={idx} src={p.url} alt="" />)}
              <button className="add-photo" onClick={() => (i === 0 ? fileInputA : fileInputB).current.click()}>+ Add</button>
            </div>
            <input
              ref={i === 0 ? fileInputA : fileInputB}
              type="file" accept="image/*" multiple style={{ display: "none" }}
              onChange={(e) => addPhotos(slot, [...e.target.files])}
            />
            <p className="hint">{slot.photos.length} photo{slot.photos.length === 1 ? "" : "s"} (need at least 2)</p>
          </div>
        ))}
      </div>

      {/* Stage 2 — embedding */}
      {totalPhotos > 0 && (
        <div className="card journey-stage">
          <div className="stage-num">2</div>
          <h3 className="stage-title">What MobileNet actually sees</h3>
          <p className="stage-copy">
            {narrationStatus === "loading" && "Asking Gemini to explain this for your specific classes..."}
            {narrationStatus === "done" && narration?.embedding}
            {narrationStatus === "idle" && "Every photo gets turned into 1,024 real numbers by MobileNet — here's a real slice of one:"}
          </p>
          {sampleEmbedding && <EmbeddingBars values={sampleEmbedding} />}
          <p className="chart-caption">24 of the 1,024 real values from an actual uploaded photo's embedding</p>
        </div>
      )}

      {/* Stage 3 — training */}
      {canTrain && (
        <div className="card journey-stage">
          <div className="stage-num">3</div>
          <h3 className="stage-title">Watch the classifier learn</h3>
          <p className="stage-copy">
            {narrationStatus === "done" ? narration?.training : "The only part that trains is a small 2-layer network sitting on top of those numbers."}
          </p>
          <NetworkDiagram active={trainStatus === "training"} classNames={[classA.name, classB.name]} />
          <AccuracyLineChart history={epochHistory} epochs={EPOCHS} />
          <button className="btn btn-primary btn-block" onClick={train} disabled={trainStatus === "training"}>
            {trainStatus === "training" ? `Training... epoch ${epochInfo.epoch}/${EPOCHS}` : trainStatus === "done" ? "Train again" : "Train your model"}
          </button>
          {trainStatus === "error" && <p className="state-msg error">Training failed: {error}</p>}
          {trainStatus === "done" && (
            <div className="stat-row" style={{ marginTop: 10 }}>
              <div className="stat"><div className="v">{Math.round(epochInfo.accuracy * 100)}%</div><div className="l">Accuracy</div></div>
              <div className="stat"><div className="v">{(trainMs / 1000).toFixed(1)}s</div><div className="l">Train time</div></div>
              <div className="stat"><div className="v">₹0.00</div><div className="l">Cloud cost</div></div>
            </div>
          )}
        </div>
      )}

      {/* Stage 4 — prediction */}
      {trainStatus === "done" && (
        <div className="card journey-stage">
          <div className="stage-num">4</div>
          <h3 className="stage-title">Try it on a new photo</h3>
          <p className="stage-copy">
            {narrationStatus === "done" ? narration?.prediction : "Upload a photo it's never seen — the same MobileNet + classifier pipeline runs on it live."}
          </p>
          <button className="btn btn-primary btn-block" onClick={() => testInputRef.current.click()}>Upload a test photo</button>
          <input ref={testInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files[0] && testPhoto(e.target.files[0])} />
          {testResult && (
            <div className="test-result-full">
              <div className="test-result-photo">
                <img src={testResult.url} alt="" />
                <span className="test-result-verdict">{testResult.className} · {Math.round(testResult.confidence * 100)}%</span>
              </div>
              {Math.min(classA.photos.length, classB.photos.length) < 5 && (
                <p className="small-sample-note">
                  ⚠ This model only ever saw {classA.photos.length} "{classA.name}" and {classB.photos.length} "{classB.name}" photos.
                  A real classifier trained on that few examples can easily be confident and wrong — it's pattern-matching on
                  whatever happened to be common across those few photos (background, lighting, pose), not necessarily the thing
                  you actually care about. Add more photos to each class above and train again to see the confidence change.
                </p>
              )}
              <PipelineFlow activeIndex={flowIndex} />
              <PredictionMath trace={testResult} classNames={[classA.name, classB.name]} playToken={replayToken} />
              <button className="replay-btn" onClick={() => { setFlowIndex(0); setReplayToken((t) => t + 1); }}>↻ Replay the math, step by step</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
