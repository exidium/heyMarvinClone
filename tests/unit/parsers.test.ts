import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseVtt } from "@/lib/transcript/parse-vtt";
import { parseSrt } from "@/lib/transcript/parse-srt";
import { parseDocx } from "@/lib/transcript/parse-docx";
import { coalesceSegments } from "@/lib/transcript/coalesce";
import { parseTranscriptFile } from "@/lib/transcript/parse-file";

const fx = (n: string) => readFileSync(`tests/fixtures/transcripts/${n}`);

describe("parseVtt", () => {
  const r = parseVtt(fx("sample.vtt").toString("utf8"));
  it("reads cues, voice tags, strips markup and decodes entities", () => {
    expect(r.warnings).toEqual([]);
    expect(r.segments).toHaveLength(6);
    expect(r.segments[0]).toEqual({ speaker: "Dana Carr", startMs: 1000, endMs: 4500, text: "Can you walk me through how a typical project starts?" });
    expect(r.segments[2].text).toBe("Then I look at the catalogue & the distributor sites.");
  });
  it("falls back to a Name: prefix and handles cues without an id line", () => {
    expect(r.segments[4]).toMatchObject({ speaker: "Dana Carr", text: "Which simulator?", startMs: 25000 });
    expect(r.segments[5]).toMatchObject({ speaker: "Pat Example", text: "Whatever the vendor ships, honestly.", startMs: 27500, endMs: 30000 });
  });
});

describe("parseSrt", () => {
  it("reads comma timings, CRLF, and strips {\\an8} and html", () => {
    const r = parseSrt(fx("sample.srt").toString("utf8"));
    expect(r.segments).toHaveLength(4);
    expect(r.segments[1]).toEqual({ speaker: "Pat Example", startMs: 5000, endMs: 8200, text: "I usually start from a part I already know." });
    expect(r.segments[2].text).toBe("Then I look at the catalogue.");
  });
});

describe("parseDocx", () => {
  it("extracts paragraphs with speaker prefixes and optional timestamps", async () => {
    const r = await parseDocx(fx("sample.docx"));
    expect(r.kind).toBe("TRANSCRIPT");
    expect(r.segments).toHaveLength(5);
    expect(r.segments[0]).toMatchObject({ speaker: "Dana Carr", startMs: null });
    expect(r.segments[2]).toMatchObject({ speaker: "Pat Example", startMs: 20000, text: "Only after that do I open the simulator.", endMs: 25000 });
    expect(r.segments[3]).toMatchObject({ speaker: "Dana Carr", startMs: 25000, text: "Which simulator?" });
  });
});

describe("coalesceSegments", () => {
  it("merges same-speaker cues within the gap until a sentence ends past the target", () => {
    const r = parseVtt(fx("sample.vtt").toString("utf8"));
    const c = coalesceSegments(r.segments);
    // cues 2 and 3 (gap 200 ms) merge; cue 4 is 8 s later and stays separate; the final two differ by speaker
    expect(c.map((s) => s.text)).toEqual([
      "Can you walk me through how a typical project starts?",
      "I usually start from a part I already know. Then I look at the catalogue & the distributor sites.",
      "Only after that do I open the simulator.",
      "Which simulator?",
      "Whatever the vendor ships, honestly.",
    ]);
    expect(c[1]).toMatchObject({ startMs: 5000, endMs: 12000 });
  });
  it("keeps merging short fragments that lack sentence punctuation, up to the hard cap", () => {
    const frags = Array.from({ length: 6 }, (_, i) => ({ speaker: "A", startMs: i * 1000, endMs: i * 1000 + 900, text: "word" }));
    expect(coalesceSegments(frags, { hardMaxChars: 14 }).map((s) => s.text)).toEqual(["word word word", "word word word"]);
  });
});

describe("parseTranscriptFile", () => {
  it("dispatches by extension and rejects unknown types", async () => {
    expect((await parseTranscriptFile(".vtt", fx("sample.vtt"))).segments.length).toBeGreaterThan(0);
    expect((await parseTranscriptFile(".md", Buffer.from("**A (0:01):** hi\n\n**B (0:02):** yo\n\n**A (0:03):** ok\n"))).kind).toBe("TRANSCRIPT");
    await expect(parseTranscriptFile(".pdf", Buffer.from(""))).rejects.toThrow(/Unsupported/);
  });
});
