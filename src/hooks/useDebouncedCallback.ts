"use client";

import { useEffect, useMemo, useRef } from "react";

/** Returns a stable debounced function plus `flush` and `cancel`. */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay: number) {
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArgs = useRef<A | null>(null);

  const api = useMemo(() => {
    const cancel = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      pendingArgs.current = null;
    };
    const flush = () => {
      if (timer.current && pendingArgs.current) {
        const args = pendingArgs.current;
        cancel();
        fnRef.current(...args);
      }
    };
    const call = (...args: A) => {
      pendingArgs.current = args;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        const a = pendingArgs.current;
        pendingArgs.current = null;
        if (a) fnRef.current(...a);
      }, delay);
    };
    return { call, flush, cancel };
  }, [delay]);

  useEffect(() => () => api.flush(), [api]);
  return api;
}
