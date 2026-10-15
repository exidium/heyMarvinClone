import { mkdtempSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dir = mkdtempSync(path.join(tmpdir(), "uploads-"));
process.env.UPLOAD_DIR = dir;
const storage = await import("@/lib/storage");

function streamOf(chunks: string[]) {
  return new ReadableStream<Uint8Array>({
    start(c) { for (const ch of chunks) c.enqueue(new TextEncoder().encode(ch)); c.close(); },
  });
}

describe("writeSourceFile", () => {
  it("streams to sources/<id>/<name> and reports bytes", async () => {
    const r = await storage.writeSourceFile("abc123", "transcript.vtt", streamOf(["WEBVTT\n", "\n1\n"]), 1000);
    expect(r).toEqual({ rel: "sources/abc123/transcript.vtt", bytes: 10 });
    expect(readFileSync(path.join(dir, r.rel), "utf8")).toBe("WEBVTT\n\n1\n");
  });
  it("rejects bodies over the limit and leaves no partial file", async () => {
    await expect(storage.writeSourceFile("abc123", "recording.mp3", streamOf(["x".repeat(60), "y".repeat(60)]), 100)).rejects.toBeInstanceOf(storage.TooLargeError);
    expect(existsSync(path.join(dir, "sources/abc123/recording.mp3"))).toBe(false);
    expect(readdirSync(path.join(dir, "sources/abc123")).filter((f) => f.includes(".part-"))).toEqual([]);
  });
  it("refuses ids and names that could escape the upload directory", async () => {
    await expect(storage.writeSourceFile("../etc", "x.vtt", streamOf(["a"]), 10)).rejects.toThrow(/Invalid id/);
    await expect(storage.writeSourceFile("abc123", "../x.vtt", streamOf(["a"]), 10)).rejects.toThrow(/Invalid filename/);
    expect(() => storage.resolveStored("../outside")).toThrow(/escapes/);
  });
});
