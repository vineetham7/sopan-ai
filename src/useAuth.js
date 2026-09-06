import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInAnonymously,
  linkWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "./firebase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgradeError, setUpgradeError] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setLoading(false);
      } else {
        signInAnonymously(auth).catch((err) => {
          console.error("anonymous sign-in failed", err);
          setLoading(false);
        });
      }
    });
    return unsub;
  }, []);

  async function upgradeWithGoogle() {
    setUpgradeError(null);
    try {
      const result = await linkWithPopup(auth.currentUser, new GoogleAuthProvider());
      setUser(result.user);
    } catch (err) {
      setUpgradeError(err.message ?? String(err));
    }
  }

  return {
    user,
    loading,
    isAnonymous: user?.isAnonymous ?? true,
    upgradeWithGoogle,
    upgradeError,
  };
}
