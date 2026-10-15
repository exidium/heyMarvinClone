import "server-only";
import { db } from "@/lib/db";
import { visibleProjectsWhere } from "@/lib/authz";
import type { User } from "@/generated/prisma/client";

export async function listParticipants(q = "") {
  return db.participant.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { company: { contains: q, mode: "insensitive" } }, { role: { contains: q, mode: "insensitive" } }, { segment: { contains: q, mode: "insensitive" } }] }
      : undefined,
    orderBy: { name: "asc" },
    include: { _count: { select: { sources: true } } },
  });
}

export async function getParticipantForUser(user: User, id: string) {
  const participant = await db.participant.findUnique({ where: { id } });
  if (!participant) return null;
  const sources = await db.source.findMany({
    where: { participants: { some: { participantId: id } }, project: visibleProjectsWhere(user) },
    orderBy: [{ date: "desc" }],
    select: { id: true, title: true, date: true, kind: true, projectId: true, project: { select: { id: true, name: true } }, _count: { select: { highlights: true } } },
  });
  return { participant, sources };
}

/** Distinct values for filters and autocomplete. */
export async function participantFacets() {
  const rows = await db.participant.findMany({ select: { role: true, company: true, segment: true, toolsUsed: true } });
  const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort();
  return {
    roles: uniq(rows.map((r) => r.role)),
    companies: uniq(rows.map((r) => r.company)),
    segments: uniq(rows.map((r) => r.segment)),
    tools: uniq(rows.flatMap((r) => r.toolsUsed)),
  };
}
