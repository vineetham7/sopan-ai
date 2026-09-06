import * as tf from "@tensorflow/tfjs";
import * as mobilenetLib from "@tensorflow-models/mobilenet";

let mobilenetPromise = null;
export function loadMobilenet() {
  if (!mobilenetPromise) {
    mobilenetPromise = mobilenetLib.load({ version: 2, alpha: 1.0 });
  }
  return mobilenetPromise;
}

// Runs a photo through MobileNet as a fixed feature extractor and returns
// the embedding as a plain array (not a tensor) so it's safe to hold in
// React state without worrying about WebGL buffer disposal.
export async function embedImage(mobilenet, imgEl) {
  const embedding = tf.tidy(() => mobilenet.infer(imgEl, true));
  const data = await embedding.data();
  embedding.dispose();
  return Array.from(data);
}

// Trains a small classifier head on top of frozen MobileNet embeddings —
// the "Teachable Machine" pattern: nothing about MobileNet itself changes,
// only these couple of dense layers, which is why this trains in seconds.
export async function trainClassifier({ embeddingsByClass, epochs = 20, onEpochEnd }) {
  const classNames = Object.keys(embeddingsByClass);
  const numClasses = classNames.length;

  const xsRows = [];
  const ysRows = [];
  classNames.forEach((name, classIndex) => {
    embeddingsByClass[name].forEach((embedding) => {
      xsRows.push(embedding);
      const oneHot = new Array(numClasses).fill(0);
      oneHot[classIndex] = 1;
      ysRows.push(oneHot);
    });
  });

  const dim = xsRows[0].length;
  const xs = tf.tensor2d(xsRows, [xsRows.length, dim]);
  const ys = tf.tensor2d(ysRows, [ysRows.length, numClasses]);

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [dim], units: 32, activation: "relu" }));
  model.add(tf.layers.dense({ units: numClasses, activation: "softmax" }));
  model.compile({ optimizer: tf.train.adam(0.001), loss: "categoricalCrossentropy", metrics: ["accuracy"] });

  await model.fit(xs, ys, {
    epochs,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => onEpochEnd?.(epoch, logs),
    },
  });

  xs.dispose();
  ys.dispose();

  return { model, classNames };
}

export async function predict(model, classNames, embedding) {
  const input = tf.tensor2d([embedding], [1, embedding.length]);
  const logits = model.predict(input);
  const probs = await logits.data();
  input.dispose();
  logits.dispose();

  let best = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[best]) best = i;
  }
  const allProbs = classNames.map((name, i) => ({ className: name, confidence: probs[i] }));
  return { className: classNames[best], confidence: probs[best], allProbs };
}

// Same prediction, but also pulls out the model's real intermediate values —
// the actual trained weights and activations for this exact photo — so the
// UI can show the literal math (weighted sum -> ReLU -> weighted sum ->
// softmax) instead of just the final answer. Nothing here is simulated:
// every number comes from the real tf.js layers of the model just trained.
export async function predictWithTrace(model, classNames, embedding) {
  const input = tf.tensor2d([embedding], [1, embedding.length]);
  const hiddenLayer = model.layers[0];
  const outputLayer = model.layers[1];

  const hiddenTensor = hiddenLayer.apply(input);
  const hidden = Array.from(await hiddenTensor.data());

  const [w1, b1] = hiddenLayer.getWeights();
  // w1/b1 themselves are the model's own live weight tensors — never dispose
  // those, or the trained model breaks for the next prediction. The slices
  // below are new temporary tensors though, and those must be disposed.
  // w1 shape is [embeddingDim, hiddenUnits] — column 0 is every input's
  // weight into hidden unit 0. Take the first 6 so the formula shown is a
  // real (partial) sum, not the full 1,024-term expression.
  const w1Slice = w1.slice([0, 0], [6, 1]);
  const b1Slice = b1.slice([0], [1]);
  const w1Sample = Array.from(await w1Slice.data());
  const b1Value = (await b1Slice.data())[0];
  w1Slice.dispose();
  b1Slice.dispose();

  const [w2, b2] = outputLayer.getWeights();
  const logitsTensor = tf.tidy(() => tf.add(tf.matMul(hiddenTensor, w2), b2));
  const logits = Array.from(await logitsTensor.data());

  const probsTensor = model.predict(input);
  const probs = Array.from(await probsTensor.data());

  input.dispose();
  hiddenTensor.dispose();
  logitsTensor.dispose();
  probsTensor.dispose();

  let best = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[best]) best = i;
  }

  return {
    embeddingSample: embedding.slice(0, 24),
    hidden,
    w1Sample,
    b1Value,
    logits,
    probs,
    allProbs: classNames.map((name, i) => ({ className: name, confidence: probs[i] })),
    className: classNames[best],
    confidence: probs[best],
  };
}

export function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
