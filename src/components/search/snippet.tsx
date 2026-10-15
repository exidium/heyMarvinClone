import { SNIP_CLOSE, SNIP_OPEN } from "@/server/queries/search";

/** Renders a ts_headline snippet, turning the private delimiters into <mark> without trusting HTML. */
export function Snippet({ text }: { text: string }) {
  const parts = text.split(new RegExp(`(${SNIP_OPEN}[^${SNIP_CLOSE}]*${SNIP_CLOSE})`, "g"));
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith(SNIP_OPEN) ? <mark key={i} className="rounded-sm bg-yellow-200/70 px-0.5 dark:bg-yellow-500/30">{p.slice(1, -1)}</mark> : <span key={i}>{p}</span>,
      )}
    </>
  );
}
