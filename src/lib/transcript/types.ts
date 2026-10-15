/** One utterance or paragraph of a source, as produced by every parser. Pure data. */
export type ParsedSegment = {
  speaker: string | null;
  startMs: number | null;
  endMs: number | null;
  text: string;
};

export type ParsedTranscript = {
  /** TRANSCRIPT when the file has speaker turns; NOTE for plain notes or summaries. */
  kind: "TRANSCRIPT" | "NOTE";
  segments: ParsedSegment[];
  warnings: string[];
};
