/** Splits an optional "Name: " prefix off a cue line. Names are short and contain no digits-only tokens. */
const PREFIX = /^([A-Za-z][A-Za-z0-9 .,'’()-]{0,48}?):\s+(.*)$/;

export function splitSpeakerPrefix(text: string): { speaker: string | null; text: string } {
  const m = PREFIX.exec(text);
  if (!m) return { speaker: null, text };
  const name = m[1].trim();
  // Avoid treating clock-like or sentence-like prefixes ("Note: ...") as speakers when very long.
  if (/^\d/.test(name) || name.split(" ").length > 5) return { speaker: null, text };
  return { speaker: name, text: m[2].trim() };
}

export function decodeEntities(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}
