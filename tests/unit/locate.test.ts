import { describe, expect, it } from "vitest";
import { buildLocateIndex, locateText, sliceAnchors } from "@/lib/transcript/locate";

const segs = [
  { id: "a", order: 0, text: "Can you walk me through a typical project?", startMs: 1000, endMs: 5000 },
  { id: "b", order: 1, text: "I usually start from a part I already know.", startMs: 5000, endMs: 12000 },
  { id: "c", order: 2, text: "The data sheet is great until a value is missing.", startMs: 12000, endMs: 20000 },
  { id: "d", order: 3, text: "I usually start from a part I already know.", startMs: 20000, endMs: 30000 },
];
const index = buildLocateIndex(segs);

describe("locateText", () => {
  it("finds an exact substring inside one segment", () => {
    const r = locateText(index, "data sheet is great");
    expect(r?.method).toBe("exact");
    expect(r?.anchors).toEqual({ startSegmentId: "c", startOffset: 4, endSegmentId: "c", endOffset: 23 });
  });
  it("spans two segments when the quote crosses a boundary", () => {
    const r = locateText(index, "already know.\nThe data sheet");
    expect(r?.method).toBe("exact");
    expect(r?.anchors).toEqual({ startSegmentId: "b", startOffset: 30, endSegmentId: "c", endOffset: 14 });
  });
  it("uses the time hint to pick between duplicate occurrences", () => {
    const late = locateText(index, "I usually start", { startMs: 20500, endMs: 25000 });
    expect(late?.anchors.startSegmentId).toBe("d");
    const early = locateText(index, "I usually start", { startMs: 5100, endMs: 9000 });
    expect(early?.anchors.startSegmentId).toBe("b");
  });
  it("matches when whitespace and case differ", () => {
    const r = locateText(index, "the  DATA sheet   is great");
    expect(r?.method).toBe("normalized");
    expect(r?.anchors).toEqual({ startSegmentId: "c", startOffset: 0, endSegmentId: "c", endOffset: 23 });
  });
  it("falls back to the time window when the text was altered", () => {
    const r = locateText(index, "teh data sheet is grate", { startMs: 12200, endMs: 19500 });
    expect(r?.method).toBe("time");
    expect(r?.anchors).toEqual({ startSegmentId: "c", startOffset: 0, endSegmentId: "c", endOffset: segs[2].text.length });
  });
  it("returns null when nothing matches and there is no time", () => {
    expect(locateText(index, "completely unrelated words")).toBeNull();
    expect(locateText(index, "   ")).toBeNull();
  });
});

describe("sliceAnchors", () => {
  it("returns the slice inside one segment", () => {
    expect(sliceAnchors(segs, { startSegmentId: "c", startOffset: 4, endSegmentId: "c", endOffset: 23 })).toBe("data sheet is great");
  });
  it("joins slices across segments with newlines", () => {
    expect(sliceAnchors(segs, { startSegmentId: "a", startOffset: 34, endSegmentId: "c", endOffset: 3 })).toBe("project?\nI usually start from a part I already know.\nThe");
  });
  it("returns empty for inverted or unknown anchors", () => {
    expect(sliceAnchors(segs, { startSegmentId: "c", startOffset: 0, endSegmentId: "a", endOffset: 3 })).toBe("");
    expect(sliceAnchors(segs, { startSegmentId: "zz", startOffset: 0, endSegmentId: "a", endOffset: 3 })).toBe("");
  });
});
