import { describe, expect, it } from "vitest";
import { parseDovetailMarkdown } from "@/lib/transcript/parse-dovetail-md";
import { parseClock, formatClock } from "@/lib/transcript/time";

const md = `[AudioVideo click to see in Dovetail](https://example.invalid/data/x)
#### Transcript
**Carr, Dana (0:03):** There we go, started. 

**Edward Example (0:25):** Um, yeah, pretty much.
Not completely restricted to RF. 

**Carr, Dana (1:02:34):** Okay, and what other areas? 

**Edward Example (1:02:40):** Linear power. 
`;

describe("parseDovetailMarkdown", () => {
  it("parses speaker turns with m:ss and h:mm:ss timestamps", () => {
    const r = parseDovetailMarkdown(md);
    expect(r.kind).toBe("TRANSCRIPT");
    expect(r.segments).toHaveLength(4);
    expect(r.segments[0]).toMatchObject({ speaker: "Carr, Dana", startMs: 3000, endMs: 25000, text: "There we go, started." });
    expect(r.segments[2].startMs).toBe(3754000);
    expect(r.segments[3].endMs).toBeNull();
  });
  it("joins continuation lines into the turn", () => {
    const r = parseDovetailMarkdown(md);
    expect(r.segments[1].text).toBe("Um, yeah, pretty much. Not completely restricted to RF.");
  });
  it("treats files with fewer than three turns as notes, one segment per paragraph", () => {
    const r = parseDovetailMarkdown("## Summary\n\nFirst paragraph.\n\n* bullet one\n\n**Someone (0:01):** a single turn\n");
    expect(r.kind).toBe("NOTE");
    expect(r.segments.map((s) => s.text)).toEqual(["Summary", "First paragraph.", "* bullet one", "**Someone (0:01):** a single turn"]);
    expect(r.segments.every((s) => s.speaker === null && s.startMs === null)).toBe(true);
  });
});

describe("clock helpers", () => {
  it("parses and formats", () => {
    expect(parseClock("0:06")).toBe(6000);
    expect(parseClock("12:34")).toBe(754000);
    expect(parseClock("1:02:03")).toBe(3723000);
    expect(parseClock("00:01:02.500")).toBe(62500);
    expect(parseClock("00:01:02,250")).toBe(62250);
    expect(parseClock("nope")).toBeNull();
    expect(formatClock(3723000)).toBe("1:02:03");
    expect(formatClock(65000)).toBe("1:05");
  });
});
