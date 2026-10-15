import mammoth from "mammoth";
import { parseClock } from "./time";
import { splitSpeakerPrefix } from "./speaker";
import type { ParsedSegment, ParsedTranscript } from "./types";

const LEAD_TIME = /^[\[(]?(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)[\])]?\s*[-–:]?\s*/;

/** DOCX exports (Teams, Krisp, manual notes): one paragraph per turn, optional "Name:" and leading timestamp. */
export async function parseDocx(buffer: Buffer): Promise<ParsedTranscript> {
  const { value, messages } = await mammoth.extractRawText({ buffer });
  const warnings = messages.filter((m) => m.type === "warning").map((m) => m.message);
  const paragraphs = value.replace(/\r\n?/g, "\n").split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  const segments: ParsedSegment[] = [];
  let withSpeaker = 0;
  for (const p of paragraphs) {
    let text = p;
    let startMs: number | null = null;
    const t = LEAD_TIME.exec(text);
    if (t) { startMs = parseClock(t[1]); text = text.slice(t[0].length); }
    const split = splitSpeakerPrefix(text);
    if (!t) {
      // Timestamp may follow the name: "Name (0:12): text"
      const m = /^(.+?)\s*[\[(](\d{1,2}:\d{2}(?::\d{2})?)[\])]:\s*(.*)$/.exec(text);
      if (m) { startMs = parseClock(m[2]); split.speaker = m[1].trim(); split.text = m[3].trim(); }
    }
    if (split.speaker) withSpeaker++;
    if (split.text) segments.push({ speaker: split.speaker, startMs, endMs: null, text: split.text });
  }
  for (let i = 0; i < segments.length; i++) segments[i].endMs = segments[i + 1]?.startMs ?? null;
  return { kind: withSpeaker >= 3 ? "TRANSCRIPT" : "NOTE", segments, warnings };
}
