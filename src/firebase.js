import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getAuth } from "firebase/auth";

// Firebase console → Project settings (gear icon) → General tab →
// "Your apps" → the web app → SDK setup and configuration → Config.
// These are safe to ship in frontend code (they identify the project,
// they don't grant access on their own) — unlike the Gemini API key.
const firebaseConfig = {
  apiKey: "AIzaSyAvtdoAv3FtwmbZDetPM0dEE3b-Djlq3ug",
  authDomain: "sopan-ai.firebaseapp.com",
  projectId: "sopan-ai",
  storageBucket: "sopan-ai.firebasestorage.app",
  messagingSenderId: "392337371258",
  appId: "1:392337371258:web:969506dedb9b8f479b0bc3",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const auth = getAuth(app);

// Cloud Functions aren't deployed yet — httpsCallable always targets
// production, so without this, Plan/Learn fail with "internal" no matter
// what. Point dev builds at `firebase emulators:start --only functions`
// (run in your own terminal, not deployed) instead.
if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
