// Shared across CodeBlock and the Bug Hunt game so Pyodide's ~10MB WASM
// runtime only ever loads once per session, not once per component.
let pyodidePromise = null;
export function loadPyodideOnce() {
  if (!pyodidePromise) {
    pyodidePromise = window.loadPyodide();
  }
  return pyodidePromise;
}
