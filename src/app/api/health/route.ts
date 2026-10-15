import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: "up" });
  } catch (e) {
    return Response.json({ ok: false, db: "down", error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
