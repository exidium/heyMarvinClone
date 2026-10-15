import { parseVtt } from "./parse-vtt";
import { parseSrt } from "./parse-srt";
import { parseDocx } from "./parse-docx";
import { parseDovetailMarkdown } from "./parse-dovetail-md";
import { coalesceSegments } from "./coalesce";
import type { ParsedTranscript } from "./types";

export const TRANSCRIPT_EXTENSIONS = [".vtt", ".srt", ".docx", ".md", ".txt"] as const;
export const RECORDING_EXTENSIONS = [".mp4", ".m4a", ".mp3"] as const;

export const RECORDING_MIME: Record<string, string> = { ".mp4": "video/mp4", ".m4a": "audio/mp4", ".mp3": "audio/mpeg" };

/** Dispatches on file extension. VTT and SRT cues are coalesced into utterances. */
export async function parseTranscriptFile(ext: string, buffer: Buffer): Promise<ParsedTranscript> {
  switch (ext.toLowerCase()) {
    case ".vtt": { const r = parseVtt(buffer.toString("utf8")); return { ...r, segments: coalesceSegments(r.segments) }; }
    case ".srt": { const r = parseSrt(buffer.toString("utf8")); return { ...r, segments: coalesceSegments(r.segments) }; }
    case ".docx": return parseDocx(buffer);
    case ".md":
    case ".txt": return parseDovetailMarkdown(buffer.toString("utf8"));
    default: throw new Error(`Unsupported transcript type ${ext}`);
  }
}
