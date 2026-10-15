import "server-only";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { randomBytes } from "node:crypto";

/**
 * Files live on server disk under UPLOAD_DIR/sources/<sourceId>/. The database stores paths
 * relative to UPLOAD_DIR so the directory can move (or become a mounted volume) without a migration.
 */
// turbopackIgnore: the directory is runtime configuration, not a build-time asset to trace.
export const UPLOAD_DIR = path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR ?? "./uploads");

export class TooLargeError extends Error {
  constructor(public readonly maxBytes: number) {
    super(`File exceeds the limit of ${maxBytes} bytes`);
    this.name = "TooLargeError";
  }
}

function assertId(id: string) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new Error("Invalid id");
}

export function sourceRelDir(sourceId: string) {
  assertId(sourceId);
  return path.posix.join("sources", sourceId);
}

/** Resolves a stored relative path and refuses anything that escapes UPLOAD_DIR. */
export function resolveStored(rel: string) {
  const abs = path.resolve(UPLOAD_DIR, rel);
  if (abs !== UPLOAD_DIR && !abs.startsWith(UPLOAD_DIR + path.sep)) throw new Error("Path escapes upload directory");
  return abs;
}

/** Counts bytes and fails the pipeline once the limit is passed. */
function byteLimiter(maxBytes: number) {
  let seen = 0;
  return new Transform({
    transform(chunk: Buffer, _enc, cb) {
      seen += chunk.length;
      if (seen > maxBytes) return cb(new TooLargeError(maxBytes));
      cb(null, chunk);
    },
  });
}

/**
 * Streams a request body to UPLOAD_DIR/sources/<sourceId>/<filename>, writing to a temp file first
 * and renaming on success so a partial upload never replaces a good file.
 */
export async function writeSourceFile(sourceId: string, filename: string, body: ReadableStream<Uint8Array>, maxBytes: number) {
  if (!/^[A-Za-z0-9._-]{1,120}$/.test(filename) || filename.includes("..")) throw new Error("Invalid filename");
  const rel = path.posix.join(sourceRelDir(sourceId), filename);
  const abs = resolveStored(rel);
  await mkdir(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.part-${randomBytes(4).toString("hex")}`;
  let bytes = 0;
  const counter = new Transform({ transform(chunk: Buffer, _e, cb) { bytes += chunk.length; cb(null, chunk); } });
  try {
    await pipeline(Readable.fromWeb(body as import("node:stream/web").ReadableStream<Uint8Array>), byteLimiter(maxBytes), counter, createWriteStream(tmp));
    await rename(tmp, abs);
  } catch (e) {
    await unlink(tmp).catch(() => {});
    throw e;
  }
  return { rel, bytes };
}

export async function removeStored(rel: string | null | undefined) {
  if (!rel) return;
  await unlink(resolveStored(rel)).catch(() => {});
}

export async function removeSourceDir(sourceId: string) {
  await rm(resolveStored(sourceRelDir(sourceId)), { recursive: true, force: true }).catch(() => {});
}

export async function storedStat(rel: string) {
  return stat(resolveStored(rel));
}

export const MAX_TRANSCRIPT_BYTES = Number(process.env.MAX_TRANSCRIPT_BYTES ?? 20_000_000);
export const MAX_RECORDING_BYTES = Number(process.env.MAX_RECORDING_BYTES ?? 2_000_000_000);
