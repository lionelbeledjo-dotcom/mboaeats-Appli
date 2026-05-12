import { useEffect, useState } from "react";

const KEY = "mboa_onboarding_seen_v1";

export function useOnboarding() {
  const [seen, setSeen] = useState<boolean>(true); // default true to avoid SSR flicker
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = window.localStorage.getItem(KEY);
      setSeen(v === "1");
    } catch {
      setSeen(true);
    }
    setHydrated(true);
  }, []);

  function markSeen() {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
    setSeen(true);
  }

  return { seen, hydrated, markSeen };
}
