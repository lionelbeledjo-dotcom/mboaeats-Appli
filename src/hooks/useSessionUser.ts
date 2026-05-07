import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentSession } from "@/lib/session.functions";
import type { MboaSession } from "@/lib/session.server";

let cache: { user: MboaSession | null } | null = null;
const listeners = new Set<(v: { user: MboaSession | null } | null) => void>();

export function invalidateSessionCache() {
  cache = null;
  listeners.forEach((l) => l(null));
}

export function useSessionUser() {
  const fetchSession = useServerFn(getCurrentSession);
  const [state, setState] = useState<{ user: MboaSession | null } | null>(cache);
  const [loading, setLoading] = useState(cache === null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSession();
      cache = res;
      setState(res);
      listeners.forEach((l) => l(res));
    } catch {
      cache = { user: null };
      setState(cache);
    } finally {
      setLoading(false);
    }
  }, [fetchSession]);

  useEffect(() => {
    const cb = (v: { user: MboaSession | null } | null) => {
      setState(v);
      if (v === null) refresh();
    };
    listeners.add(cb);
    if (cache === null) refresh();
    else setLoading(false);
    return () => {
      listeners.delete(cb);
    };
  }, [refresh]);

  return { user: state?.user ?? null, loading, refresh };
}
