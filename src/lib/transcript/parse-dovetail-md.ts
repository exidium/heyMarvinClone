import { parseClock } from "./time";
import type { ParsedSegment, ParsedTranscript } from "./types";

/**
 * Parses the markdown export shape used by the Dovetail mirror:
 *   **Speaker Name (m:ss):** text
 * Blocks are separated by blank lines; continuation lines belong to the previous block.
 * Files with fewer than three speaker turns are treated as NOTE: one segment per paragraph.
 */
const TURN = /^\*\*(.+?) \((\d{1,2}:\d{2}(?::\d{2})?)\):\*\*\s?(.*)$/;
const SKIP = [/^\[AudioVideo /, /^#{1,6}\s*Transcript\s*$/];

export function parseDovetailMarkdown(markdown: string): ParsedTranscript {
  const warnings: string[] = [];
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      if (current.length) blocks.push(current);
      current = [];
      continue;
    }
    if (SKIP.some((re) => re.test(line))) continue;
    current.push(line);
  }
  if (current.length) blocks.push(current);

  const turns: ParsedSegment[] = [];
  let speakerBlocks = 0;
  for (const block of blocks) {
    const m = TURN.exec(block[0]);
    if (m) {
      speakerBlocks++;
      const startMs = parseClock(m[2]);
      if (startMs === null) warnings.push(`Unreadable timestamp "${m[2]}"`);
      const text = [m[3], ...block.slice(1)].join(" ").replace(/\s+/g, " ").trim();
      turns.push({ speaker: m[1].trim(), startMs, endMs: null, text });
    } else if (turns.length) {
      // A block without a speaker marker inside a transcript: append to the previous turn.
      const prev = turns[turns.length - 1];
      prev.text = `${prev.text} ${block.join(" ")}`.replace(/\s+/g, " ").trim();
    } else {
      turns.push({ speaker: null, startMs: null, endMs: null, text: block.join(" ").trim() });
    }
  }

  if (speakerBlocks < 3) {
    const segments = blocks
      .map((b) => b.join(" ").replace(/^#{1,6}\s*/, "").replace(/\s+/g, " ").trim())
      .filter((t) => t.length > 0)
      .map((text) => ({ speaker: null, startMs: null, endMs: null, text }));
    return { kind: "NOTE", segments, warnings };
  }

  const segments = turns.filter((t) => t.text.length > 0);
  for (let i = 0; i < segments.length; i++) {
    const next = segments[i + 1];
    segments[i].endMs = next?.startMs ?? null;
  }
  return { kind: "TRANSCRIPT", segments, warnings };
}
