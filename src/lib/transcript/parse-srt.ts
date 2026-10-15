import { parseClock } from "./time";
import { decodeEntities, splitSpeakerPrefix } from "./speaker";
import type { ParsedSegment, ParsedTranscript } from "./types";

const TIMING = /^(\S+)\s+-->\s+(\S+)/;

/** SubRip: numbered blocks with "hh:mm:ss,mmm --> hh:mm:ss,mmm" and text lines. */
export function parseSrt(input: string): ParsedTranscript {
  const warnings: string[] = [];
  const text = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const segments: ParsedSegment[] = [];
  for (const block of text.split(/\n\n+/)) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (!lines.length) continue;
    const ti = lines.findIndex((l) => TIMING.test(l));
    if (ti === -1) continue;
    const timing = TIMING.exec(lines[ti])!;
    const startMs = parseClock(timing[1]);
    const endMs = parseClock(timing[2]);
    if (startMs == null || endMs == null) { warnings.push(`Unreadable cue timing "${lines[ti]}"`); continue; }
    const raw = lines.slice(ti + 1).join(" ");
    let body = decodeEntities(raw.replace(/\{\\[^}]*\}/g, "").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    const split = splitSpeakerPrefix(body);
    body = split.text;
    if (body) segments.push({ speaker: split.speaker, startMs, endMs, text: body });
  }
  return { kind: "TRANSCRIPT", segments, warnings };
}
