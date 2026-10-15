/**
 * Conversions between database rows and the TipTap/ProseMirror document, and between
 * editor positions and (segmentId, offset) anchors. Pure and unit-tested.
 *
 * Position model: doc > segment > text. A segment's content starts at $pos.start(1); text nodes
 * take one position per character, so `pos - start` is exactly the character offset into Segment.text.
 */
import type { JSONContent } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { Anchors } from "./locate";

export type DocSegment = { id: string; order: number; speaker: string | null; startMs: number | null; endMs: number | null; text: string };
export type DocHighlight = { id: string; startSegmentId: string; startOffset: number; endSegmentId: string; endOffset: number; status: "ACTIVE" | "ORPHANED"; color?: string | null };
export type MarkRange = { highlightId: string; from: number; to: number };

export function buildTranscriptDoc(segments: DocSegment[], highlights: DocHighlight[]): JSONContent {
  const sorted = [...segments].sort((a, b) => a.order - b.order);
  const orderOf = new Map(sorted.map((s) => [s.id, s.order]));
  // Per segment, the mark intervals [from, to) with the highlight they belong to.
  const perSegment = new Map<string, { id: string; from: number; to: number; color: string | null }[]>();
  for (const h of highlights) {
    if (h.status !== "ACTIVE") continue;
    const so = orderOf.get(h.startSegmentId);
    const eo = orderOf.get(h.endSegmentId);
    if (so == null || eo == null || so > eo) continue;
    for (const s of sorted) {
      if (s.order < so || s.order > eo) continue;
      const from = s.order === so ? Math.min(h.startOffset, s.text.length) : 0;
      const to = s.order === eo ? Math.min(h.endOffset, s.text.length) : s.text.length;
      if (to <= from) continue;
      const list = perSegment.get(s.id) ?? [];
      list.push({ id: h.id, from, to, color: h.color ?? null });
      perSegment.set(s.id, list);
    }
  }
  return {
    type: "doc",
    content: sorted.map((s) => ({
      type: "segment",
      attrs: { segmentId: s.id, order: s.order, speaker: s.speaker, startMs: s.startMs, endMs: s.endMs },
      content: textRuns(s.text, perSegment.get(s.id) ?? []),
    })),
  };
}

/** Splits text into runs at every interval boundary; each run carries the marks covering it. */
function textRuns(text: string, intervals: { id: string; from: number; to: number; color: string | null }[]): JSONContent[] {
  if (!text) return [];
  if (!intervals.length) return [{ type: "text", text }];
  const points = new Set<number>([0, text.length]);
  for (const i of intervals) { points.add(i.from); points.add(i.to); }
  const cuts = [...points].sort((a, b) => a - b);
  const runs: JSONContent[] = [];
  for (let k = 0; k < cuts.length - 1; k++) {
    const a = cuts[k];
    const b = cuts[k + 1];
    if (b <= a) continue;
    const marks = intervals.filter((i) => i.from <= a && i.to >= b).map((i) => ({ type: "highlight", attrs: { highlightId: i.id, color: i.color } }));
    runs.push(marks.length ? { type: "text", text: text.slice(a, b), marks } : { type: "text", text: text.slice(a, b) });
  }
  return runs;
}

/** Shrinks a selection so it starts and ends on non-whitespace; null when nothing remains. */
export function trimSelection(doc: PMNode, from: number, to: number): { from: number; to: number } | null {
  let a = from;
  let b = to;
  while (a < b && /\s/.test(doc.textBetween(a, a + 1, "\n", "\n") || " ")) a++;
  while (b > a && /\s/.test(doc.textBetween(b - 1, b, "\n", "\n") || " ")) b--;
  return b > a ? { from: a, to: b } : null;
}

/** Editor selection → segment anchors. Null when the selection is empty or outside segments. */
export function anchorsFromSelection(doc: PMNode, from: number, to: number): Anchors | null {
  if (to <= from) return null;
  const $from = doc.resolve(from);
  const $to = doc.resolve(to);
  if ($from.depth < 1 || $to.depth < 1) return null;
  const startNode = $from.node(1);
  const endNode = $to.node(1);
  if (startNode.type.name !== "segment" || endNode.type.name !== "segment") return null;
  return {
    startSegmentId: startNode.attrs.segmentId,
    startOffset: from - $from.start(1),
    endSegmentId: endNode.attrs.segmentId,
    endOffset: to - $to.start(1),
  };
}

/** The highlight mark ranges inside one segment node, as character offsets, merged per highlight. */
export function markRangesOfSegment(segment: PMNode): MarkRange[] {
  const ranges = new Map<string, { from: number; to: number }>();
  segment.forEach((child, offset) => {
    for (const m of child.marks) {
      if (m.type.name !== "highlight" || !m.attrs.highlightId) continue;
      const id = m.attrs.highlightId as string;
      const cur = ranges.get(id);
      const from = offset;
      const to = offset + child.nodeSize;
      if (!cur) ranges.set(id, { from, to });
      else { cur.from = Math.min(cur.from, from); cur.to = Math.max(cur.to, to); }
    }
  });
  return [...ranges.entries()].map(([highlightId, r]) => ({ highlightId, ...r }));
}

/** Finds the segment node (and its position) for a segment id. */
export function findSegment(doc: PMNode, segmentId: string): { node: PMNode; pos: number } | null {
  let found: { node: PMNode; pos: number } | null = null;
  doc.forEach((node, offset) => {
    if (!found && node.attrs.segmentId === segmentId) found = { node, pos: offset };
  });
  return found;
}

/** Absolute editor positions covered by anchors, or null if a segment is missing. */
export function positionsOfAnchors(doc: PMNode, a: Anchors): { from: number; to: number } | null {
  const s = findSegment(doc, a.startSegmentId);
  const e = findSegment(doc, a.endSegmentId);
  if (!s || !e) return null;
  const from = s.pos + 1 + Math.min(a.startOffset, s.node.content.size);
  const to = e.pos + 1 + Math.min(a.endOffset, e.node.content.size);
  return to > from ? { from, to } : null;
}

/** Ordered list of segment ids in a doc (the invariant the editor enforces). */
export function segmentIdsOf(doc: PMNode): string[] {
  const ids: string[] = [];
  doc.forEach((n) => ids.push(n.attrs.segmentId));
  return ids;
}
