/**
 * Finds a piece of quoted text inside an ordered list of segments and returns segment anchors.
 * Used by the importer, where highlights arrive as text plus optional start/end seconds.
 * Strategy: exact match → whitespace-normalised match → time window → null.
 */
export type LocatableSegment = { id: string; order: number; text: string; startMs: number | null; endMs: number | null };

export type Anchors = { startSegmentId: string; startOffset: number; endSegmentId: string; endOffset: number };

export type LocateIndex = {
  segments: LocatableSegment[];
  joined: string; // texts joined with "\n"
  starts: number[]; // global index where each segment's text starts
  normalized: string;
  normToOrig: number[]; // normalized index → original (joined) index
};

export function buildLocateIndex(segments: LocatableSegment[]): LocateIndex {
  const sorted = [...segments].sort((a, b) => a.order - b.order);
  const starts: number[] = [];
  let joined = "";
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) joined += "\n";
    starts.push(joined.length);
    joined += sorted[i].text;
  }
  const { text: normalized, map: normToOrig } = normalize(joined);
  return { segments: sorted, joined, starts, normalized, normToOrig };
}

/** Collapses whitespace runs to one space, lowercases, and keeps a map back to original indexes. */
function normalize(s: string): { text: string; map: number[] } {
  let out = "";
  const map: number[] = [];
  let lastSpace = true;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      if (!lastSpace) {
        out += " ";
        map.push(i);
        lastSpace = true;
      }
      continue;
    }
    out += ch.toLowerCase();
    map.push(i);
    lastSpace = false;
  }
  if (out.endsWith(" ")) {
    out = out.slice(0, -1);
    map.pop();
  }
  return { text: out, map };
}

function globalToAnchor(index: LocateIndex, globalStart: number, globalEnd: number): Anchors | null {
  if (globalEnd <= globalStart) return null;
  const segAt = (g: number) => {
    let lo = 0;
    for (let i = 0; i < index.starts.length; i++) if (index.starts[i] <= g) lo = i;
    return lo;
  };
  const si = segAt(globalStart);
  const ei = segAt(globalEnd - 1);
  const start = index.segments[si];
  const end = index.segments[ei];
  let startOffset = globalStart - index.starts[si];
  let endOffset = globalEnd - index.starts[ei];
  // Clamp to the segment text (a match may begin or end on the "\n" separator).
  startOffset = Math.min(Math.max(0, startOffset), start.text.length);
  endOffset = Math.min(Math.max(0, endOffset), end.text.length);
  if (si === ei && endOffset <= startOffset) return null;
  return { startSegmentId: start.id, startOffset, endSegmentId: end.id, endOffset };
}

function allIndexes(hay: string, needle: string): number[] {
  const out: number[] = [];
  let i = hay.indexOf(needle);
  while (i !== -1 && out.length < 50) {
    out.push(i);
    i = hay.indexOf(needle, i + 1);
  }
  return out;
}

/** Among several candidate global positions, prefer the one whose segment start time is closest to the hint. */
function pickByTime(index: LocateIndex, candidates: number[], hintMs: number | null): number {
  if (candidates.length === 1 || hintMs == null) return candidates[0];
  let best = candidates[0];
  let bestDist = Infinity;
  for (const c of candidates) {
    let si = 0;
    for (let i = 0; i < index.starts.length; i++) if (index.starts[i] <= c) si = i;
    const t = index.segments[si].startMs;
    const d = t == null ? Infinity : Math.abs(t - hintMs);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

export type LocateResult = { anchors: Anchors; method: "exact" | "normalized" | "time" };

export function locateText(
  index: LocateIndex,
  text: string,
  times?: { startMs: number | null; endMs: number | null },
): LocateResult | null {
  const needle = text.trim();
  if (!needle) return null;
  const hint = times?.startMs ?? null;

  // 1. exact
  const exact = allIndexes(index.joined, needle);
  if (exact.length) {
    const g = pickByTime(index, exact, hint);
    const a = globalToAnchor(index, g, g + needle.length);
    if (a) return { anchors: a, method: "exact" };
  }

  // 2. whitespace / case normalised
  const n = normalize(needle).text;
  if (n) {
    const found = allIndexes(index.normalized, n);
    if (found.length) {
      const candidates = found.map((f) => index.normToOrig[f]);
      const g = pickByTime(index, candidates, hint);
      const f = found[candidates.indexOf(g)];
      const gEnd = index.normToOrig[f + n.length - 1] + 1;
      const a = globalToAnchor(index, g, gEnd);
      if (a) return { anchors: a, method: "normalized" };
    }
  }

  // 3. time window: anchor the whole segments that overlap [start, end]
  if (times && times.startMs != null) {
    const start = times.startMs;
    const end = Math.max(times.endMs ?? start + 1, start + 1);
    const hits = index.segments.filter((s) => s.startMs != null && s.startMs < end && (s.endMs ?? Infinity) > start);
    if (hits.length) {
      const first = hits[0];
      const last = hits[hits.length - 1];
      return {
        anchors: { startSegmentId: first.id, startOffset: 0, endSegmentId: last.id, endOffset: last.text.length },
        method: "time",
      };
    }
    // No overlap (gap in timestamps): fall back to the last segment that starts before the hint.
    const containing = [...index.segments].reverse().find((s) => s.startMs != null && s.startMs <= start);
    if (containing) {
      return {
        anchors: { startSegmentId: containing.id, startOffset: 0, endSegmentId: containing.id, endOffset: containing.text.length },
        method: "time",
      };
    }
  }
  return null;
}

/**
 * Rebuilds the text a set of anchors covers: the slice of the start segment, every whole segment
 * in between, and the slice of the end segment, joined with "\n". This is the canonical
 * Highlight.text and is recomputed whenever an anchored segment changes.
 */
export function sliceAnchors(segments: { id: string; order: number; text: string }[], a: Anchors): string {
  const sorted = [...segments].sort((x, y) => x.order - y.order);
  const si = sorted.findIndex((s) => s.id === a.startSegmentId);
  const ei = sorted.findIndex((s) => s.id === a.endSegmentId);
  if (si === -1 || ei === -1 || ei < si) return "";
  if (si === ei) return sorted[si].text.slice(a.startOffset, a.endOffset);
  const parts = [sorted[si].text.slice(a.startOffset)];
  for (let i = si + 1; i < ei; i++) parts.push(sorted[i].text);
  parts.push(sorted[ei].text.slice(0, a.endOffset));
  return parts.join("\n");
}
