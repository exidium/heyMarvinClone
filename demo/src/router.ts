import { useEffect, useState } from "react";

/** Hash routing so deep links work on GitHub Pages: #/projects/abc?x=1 */
export type Route = { path: string; parts: string[]; params: URLSearchParams };

export function parseHash(hash = location.hash): Route {
  const raw = hash.replace(/^#/, "") || "/explore";
  const [path, qs = ""] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  return { path: "/" + parts.join("/"), parts, params: new URLSearchParams(qs) };
}

export function href(path: string, params?: Record<string, string | null | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v) p.set(k, v);
  const qs = p.toString();
  return `#${path}${qs ? "?" + qs : ""}`;
}

export function navigate(path: string, params?: Record<string, string | null | undefined>, replace = false) {
  const h = href(path, params);
  if (replace) history.replaceState(null, "", h); else location.hash = h.slice(1);
  if (replace) window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
