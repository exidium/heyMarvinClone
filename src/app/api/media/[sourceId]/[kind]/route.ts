import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { db } from "@/lib/db";
import { guardSource } from "@/server/api-auth";
import { resolveStored, storedStat } from "@/lib/storage";

/**
 * GET/HEAD /api/media/[sourceId]/recording|transcript
 * Streams the stored file. Recordings support single-range requests so <video>/<audio> can seek.
 */
async function handle(request: Request, ctx: RouteContext<"/api/media/[sourceId]/[kind]">, head: boolean) {
  const { sourceId, kind } = await ctx.params;
  if (kind !== "transcript" && kind !== "recording") return new Response("Not found", { status: 404 });
  const guard = await guardSource(sourceId, "VIEWER");
  if (guard instanceof Response) return guard;

  const source = await db.source.findUniqueOrThrow({ where: { id: sourceId }, select: { transcriptPath: true, transcriptName: true, recordingPath: true, recordingName: true, recordingMime: true } });
  const rel = kind === "recording" ? source.recordingPath : source.transcriptPath;
  if (!rel) return new Response("No file", { status: 404 });
  const abs = resolveStored(rel);
  const st = await storedStat(rel).catch(() => null);
  if (!st) return new Response("File missing on disk", { status: 404 });

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=0",
    "Content-Type": kind === "recording" ? source.recordingMime ?? "application/octet-stream" : "application/octet-stream",
  });
  if (kind === "transcript") headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(source.transcriptName ?? "transcript")}"`);

  const range = request.headers.get("range");
  let start = 0;
  let end = st.size - 1;
  let status = 200;
  if (range && kind === "recording") {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!m || (m[1] === "" && m[2] === "")) return new Response("Bad range", { status: 416, headers: { "Content-Range": `bytes */${st.size}` } });
    if (m[1] === "") { start = Math.max(0, st.size - Number(m[2])); }
    else { start = Number(m[1]); if (m[2] !== "") end = Math.min(end, Number(m[2])); }
    if (start > end || start >= st.size) return new Response("Range not satisfiable", { status: 416, headers: { "Content-Range": `bytes */${st.size}` } });
    status = 206;
    headers.set("Content-Range", `bytes ${start}-${end}/${st.size}`);
  }
  headers.set("Content-Length", String(end - start + 1));
  if (head) return new Response(null, { status, headers });
  const stream = Readable.toWeb(createReadStream(abs, { start, end })) as unknown as ReadableStream;
  return new Response(stream, { status, headers });
}

export const GET = (req: Request, ctx: RouteContext<"/api/media/[sourceId]/[kind]">) => handle(req, ctx, false);
export const HEAD = (req: Request, ctx: RouteContext<"/api/media/[sourceId]/[kind]">) => handle(req, ctx, true);
