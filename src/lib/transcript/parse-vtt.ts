import { parseClock } from "./time";
import { decodeEntities, splitSpeakerPrefix } from "./speaker";
import type { ParsedSegment, ParsedTranscript } from "./types";

const TIMING = /^(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/;
const VOICE = /<v(?:\.[^\s>]*)?\s+([^>]+)>/i;

/** WebVTT: header, optional NOTE/STYLE/REGION blocks, cues with optional id, timing line and text. */
export function parseVtt(input: string): ParsedTranscript {
  const warnings: string[] = [];
  const text = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  if (!/^WEBVTT/.test(text)) warnings.push("Missing WEBVTT header");
  const blocks = text.split(/\n\n+/);
  const segments: ParsedSegment[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (!lines.length) continue;
    if (/^(WEBVTT|NOTE|STYLE|REGION)/.test(lines[0])) continue;
    let i = 0;
    if (!TIMING.test(lines[0]) && lines.length > 1 && TIMING.test(lines[1])) i = 1; // cue id line
    const timing = TIMING.exec(lines[i]);
    if (!timing) continue;
    const startMs = parseClock(timing[1]);
    const endMs = parseClock(timing[2]);
    if (startMs == null || endMs == null) { warnings.push(`Unreadable cue timing "${lines[i]}"`); continue; }
    const raw = lines.slice(i + 1).join(" ");
    let speaker: string | null = null;
    const v = VOICE.exec(raw);
    if (v) speaker = v[1].trim();
    let body = decodeEntities(raw.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    if (!speaker) {
      const split = splitSpeakerPrefix(body);
      speaker = split.speaker;
      body = split.text;
    }
    if (body) segments.push({ speaker, startMs, endMs, text: body });
  }
  return { kind: "TRANSCRIPT", segments, warnings };
}
