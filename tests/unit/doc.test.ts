import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { transcriptExtensions } from "@/lib/transcript/schema";
import { anchorsFromSelection, buildTranscriptDoc, findSegment, markRangesOfSegment, positionsOfAnchors, segmentIdsOf, trimSelection } from "@/lib/transcript/doc";

const schema = getSchema(transcriptExtensions);
const segs = [
  { id: "a", order: 0, speaker: "Dana", startMs: 0, endMs: 5000, text: "Hello there friend." }, // 19 chars
  { id: "b", order: 1, speaker: "Pat", startMs: 5000, endMs: 9000, text: "I use a spreadsheet." }, // 20 chars
  { id: "c", order: 2, speaker: "Dana", startMs: 9000, endMs: null, text: "" },
];
const hls = [
  { id: "h1", startSegmentId: "a", startOffset: 6, endSegmentId: "a", endOffset: 11, status: "ACTIVE" as const, color: "#f00" }, // "there"
  { id: "h2", startSegmentId: "a", startOffset: 12, endSegmentId: "b", endOffset: 5, status: "ACTIVE" as const }, // "friend.\nI use"
  { id: "h3", startSegmentId: "b", startOffset: 2, endSegmentId: "b", endOffset: 7, status: "ACTIVE" as const }, // "use a" overlaps h2
  { id: "orphan", startSegmentId: "b", startOffset: 0, endSegmentId: "b", endOffset: 3, status: "ORPHANED" as const },
];
const json = buildTranscriptDoc(segs, hls);
const doc = PMNode.fromJSON(schema, json);

describe("buildTranscriptDoc", () => {
  it("produces one segment node per segment with attrs, in order, including empty ones", () => {
    expect(segmentIdsOf(doc)).toEqual(["a", "b", "c"]);
    expect(doc.child(0).attrs).toMatchObject({ segmentId: "a", speaker: "Dana", startMs: 0 });
    expect(doc.child(2).content.size).toBe(0);
    expect(doc.textBetween(0, doc.content.size, "\n")).toBe("Hello there friend.\nI use a spreadsheet.\n");
  });
  it("renders active highlights as marks, splitting runs at boundaries and allowing overlaps", () => {
    expect(markRangesOfSegment(doc.child(0))).toEqual(expect.arrayContaining([
      { highlightId: "h1", from: 6, to: 11 },
      { highlightId: "h2", from: 12, to: 19 },
    ]));
    expect(markRangesOfSegment(doc.child(1))).toEqual(expect.arrayContaining([
      { highlightId: "h2", from: 0, to: 5 },
      { highlightId: "h3", from: 2, to: 7 },
    ]));
    expect(markRangesOfSegment(doc.child(1)).find((r) => r.highlightId === "orphan")).toBeUndefined();
    const run = json.content![0].content!.find((r) => r.text === "there");
    expect(run?.marks?.[0].attrs).toEqual({ highlightId: "h1", color: "#f00" });
  });
});

describe("anchors <-> positions", () => {
  it("round-trips anchors through absolute positions", () => {
    for (const h of hls.slice(0, 3)) {
      const pos = positionsOfAnchors(doc, h)!;
      expect(anchorsFromSelection(doc, pos.from, pos.to)).toEqual({ startSegmentId: h.startSegmentId, startOffset: h.startOffset, endSegmentId: h.endSegmentId, endOffset: h.endOffset });
    }
  });
  it("computes offsets relative to each segment", () => {
    const b = findSegment(doc, "b")!;
    const a = anchorsFromSelection(doc, b.pos + 1 + 2, b.pos + 1 + 7)!;
    expect(a).toEqual({ startSegmentId: "b", startOffset: 2, endSegmentId: "b", endOffset: 7 });
    expect(doc.textBetween(b.pos + 1 + 2, b.pos + 1 + 7)).toBe("use a");
  });
  it("returns null for empty selections", () => {
    expect(anchorsFromSelection(doc, 5, 5)).toBeNull();
  });
});

describe("trimSelection", () => {
  it("drops surrounding whitespace and returns null when only whitespace is selected", () => {
    const a = findSegment(doc, "a")!;
    const from = a.pos + 1 + 5; // the space before "there"
    const to = a.pos + 1 + 12; // the space after "there"
    expect(trimSelection(doc, from, to)).toEqual({ from: from + 1, to: to - 1 });
    expect(trimSelection(doc, from, from + 1)).toBeNull();
  });
});
