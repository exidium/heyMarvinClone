import type { ParsedSegment } from "./types";

export type CoalesceOptions = { maxGapMs?: number; targetChars?: number; hardMaxChars?: number };

/**
 * Merges consecutive same-speaker cues into utterance-sized segments (decision D18):
 * keep merging while the gap is short and the text has not yet reached a sentence end
 * past the target length. A hard cap stops runaway merges.
 */
export function coalesceSegments(segments: ParsedSegment[], opts: CoalesceOptions = {}): ParsedSegment[] {
  const maxGapMs = opts.maxGapMs ?? 2000;
  const targetChars = opts.targetChars ?? 200;
  const hardMaxChars = opts.hardMaxChars ?? 700;
  const out: ParsedSegment[] = [];
  for (const seg of segments) {
    const cur = out[out.length - 1];
    if (cur && canMerge(cur, seg, maxGapMs, targetChars, hardMaxChars)) {
      cur.text = `${cur.text} ${seg.text}`.trim();
      cur.endMs = seg.endMs ?? cur.endMs;
    } else {
      out.push({ ...seg });
    }
  }
  return out;
}

function canMerge(cur: ParsedSegment, next: ParsedSegment, maxGapMs: number, targetChars: number, hardMaxChars: number) {
  if (cur.speaker !== next.speaker) return false;
  if (cur.endMs != null && next.startMs != null && next.startMs - cur.endMs > maxGapMs) return false;
  if (cur.text.length + next.text.length > hardMaxChars) return false;
  const endsSentence = /[.!?…]["'”’)\]]?$/.test(cur.text);
  return !(endsSentence && cur.text.length >= targetChars);
}
