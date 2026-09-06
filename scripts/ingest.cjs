const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { GoogleGenAI } = require("@google/genai");

initializeApp({
  credential: cert(require("../serviceAccountKey.json")),
});
const db = getFirestore();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 20 short chunks, real open-source sources, matching the skillGraph domain
// (variables -> loops -> functions -> lists -> numpy). Attribution kept so
// nothing is ever presented to a learner as unsourced.
const chunks = [
  {
    id: "fastai-lesson1-what-is-ml",
    text: "Machine learning is a way of solving problems by showing a computer examples instead of writing explicit rules. Instead of a programmer coding every decision by hand, the computer learns the pattern from data and generalizes it to new, unseen examples.",
    source: "https://course.fast.ai/Lessons/lesson1.html",
  },
  {
    id: "pycourse-w3-variables",
    text: "A variable in Python is a name that refers to a value stored in memory. You create one by writing a name, an equals sign, and a value, like age = 25. Python figures out the type automatically — no separate declaration is needed.",
    source: "https://www.w3schools.com/python/python_variables.asp",
  },
  {
    id: "pycourse-w3-datatypes",
    text: "Python has several built-in data types: int for whole numbers, float for decimals, str for text, bool for True/False, and collections like list, tuple, and dict. The type() function tells you which one a value belongs to.",
    source: "https://www.w3schools.com/python/python_datatypes.asp",
  },
  {
    id: "pyorg-tutorial-numbers",
    text: "Python supports integers and floating point numbers, and the interpreter acts as a simple calculator: you can type an expression and it writes the value. Operators like +, -, *, / and ** (power) work as expected, with parentheses used for grouping.",
    source: "https://docs.python.org/3/tutorial/introduction.html",
  },
  {
    id: "pyorg-tutorial-forloop",
    text: "Python's for statement iterates over the items of any sequence, such as a list or a string, in the order that they appear. This differs from languages where for is only a way to step through numbers — Python's version steps directly through the collection itself.",
    source: "https://docs.python.org/3/tutorial/controlflow.html",
  },
  {
    id: "pyorg-tutorial-while",
    text: "The while statement executes as long as its condition remains true, checking the condition again before every pass through the loop. A common pattern is updating a counter or accumulator inside the loop body until the stopping condition is reached.",
    source: "https://docs.python.org/3/tutorial/introduction.html",
  },
  {
    id: "pyorg-tutorial-range",
    text: "The range() function generates a sequence of numbers, commonly used for looping a specific number of times. range(5) produces 0, 1, 2, 3, 4 — it starts at 0 by default and stops one before the given endpoint.",
    source: "https://docs.python.org/3/tutorial/controlflow.html",
  },
  {
    id: "pyorg-tutorial-functions",
    text: "The keyword def introduces a function definition, followed by the function name and a parenthesized list of parameters. The statements that form the body of the function start on the next line and must be indented. A function can optionally return a value with the return statement.",
    source: "https://docs.python.org/3/tutorial/controlflow.html",
  },
  {
    id: "pyorg-tutorial-default-args",
    text: "Functions can have default argument values, so callers can omit arguments that rarely change. Defining def greet(name, greeting='Hello'): lets someone call greet('Ana') and get 'Hello, Ana' without specifying a greeting every time.",
    source: "https://docs.python.org/3/tutorial/controlflow.html",
  },
  {
    id: "pyorg-tutorial-lists",
    text: "Lists are Python's most versatile compound data type. They can hold a mix of types and can be indexed, sliced, and modified: append() adds an item, and elements are accessed with square brackets, like my_list[0] for the first item.",
    source: "https://docs.python.org/3/tutorial/introduction.html",
  },
  {
    id: "pyorg-tutorial-dicts",
    text: "A dictionary is a collection of key-value pairs, where each key must be unique. Unlike a list indexed by numeric position, a dictionary is indexed by keys, which can be any immutable type — most often strings or numbers.",
    source: "https://docs.python.org/3/tutorial/datastructures.html",
  },
  {
    id: "pyorg-tutorial-list-comprehension",
    text: "List comprehensions provide a concise way to create lists. A common application is to build a new list from an existing one by applying an expression to each element, optionally filtered by a condition — for example, [x for x in range(10) if x % 2 == 0].",
    source: "https://docs.python.org/3/tutorial/datastructures.html",
  },
  {
    id: "numpy-quickstart-intro",
    text: "NumPy's main object is the homogeneous multidimensional array — a table of elements, all of the same type, indexed by a tuple of non-negative integers. NumPy dimensions are called axes, and the number of axes is the array's rank.",
    source: "https://numpy.org/doc/stable/user/quickstart.html",
  },
  {
    id: "numpy-quickstart-shape",
    text: "An array's shape is a tuple of integers giving the size of the array along each dimension. For a matrix with n rows and m columns, shape will be (n, m), and the length of shape is therefore the number of axes, ndim.",
    source: "https://numpy.org/doc/stable/user/quickstart.html",
  },
  {
    id: "numpy-quickstart-creation",
    text: "Arrays can be created from regular Python lists or tuples using the array() function, and NumPy also provides functions like zeros(), ones(), and arange() to create arrays with initial placeholder content or evenly spaced values.",
    source: "https://numpy.org/doc/stable/user/quickstart.html",
  },
  {
    id: "numpy-quickstart-elementwise",
    text: "Arithmetic operators on arrays apply elementwise; a new array is created and filled with the result. Subtracting two same-shaped arrays subtracts corresponding elements, and multiplying an array by a number scales every element by that number.",
    source: "https://numpy.org/doc/stable/user/quickstart.html",
  },
  {
    id: "numpy-broadcasting-basics",
    text: "Broadcasting describes how NumPy treats arrays with different shapes during arithmetic operations, subject to certain constraints, so that the smaller array is 'broadcast' across the larger one so they have compatible shapes, without actually copying data.",
    source: "https://numpy.org/doc/stable/user/basics.broadcasting.html",
  },
  {
    id: "hf-course-what-is-nlp",
    text: "Natural Language Processing is a field combining linguistics and machine learning focused on understanding text and spoken words, in a way similar to how a human being can. Tasks range from classifying whole sentences to generating new text.",
    source: "https://huggingface.co/learn/nlp-course/chapter1/1",
  },
  {
    id: "mlcc-what-is-ml",
    text: "Machine learning systems learn how to combine input to produce useful predictions on data they haven't seen before, using a model, which is a mathematical relationship derived from data. Supervised learning trains a model from input features and their corresponding labels.",
    source: "https://developers.google.com/machine-learning/crash-course/ml-intro",
  },
  {
    id: "mlcc-loss",
    text: "Loss is a numerical metric that describes how wrong a model's predictions are. The lower the loss, the better the model performs. Training a model is essentially the process of finding parameters that minimize loss across the training data.",
    source: "https://developers.google.com/machine-learning/crash-course/linear-regression/loss",
  },
];

async function run() {
  for (const chunk of chunks) {
    const { embeddings } = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: chunk.text,
      config: { outputDimensionality: 768 },
    });
    await db.collection("contentChunks").doc(chunk.id).set({
      text: chunk.text,
      source: chunk.source,
      embedding: FieldValue.vector(embeddings[0].values),
    });
    console.log("embedded", chunk.id);
  }
  process.exit(0);
}
run();
