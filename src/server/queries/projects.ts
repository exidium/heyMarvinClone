import "server-only";
import { db } from "@/lib/db";
import { getProjectRole, visibleProjectsWhere } from "@/lib/authz";
import type { User } from "@/generated/prisma/client";

export async function listProjects(user: User, opts: { includeArchived?: boolean } = {}) {
  return db.project.findMany({
    where: { AND: [visibleProjectsWhere(user), opts.includeArchived ? {} : { archivedAt: null }] },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true, name: true, productArea: true, startDate: true, endDate: true, access: true, archivedAt: true,
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { sources: true, members: true } },
    },
  });
}

export async function countHighlightsByProject(projectIds: string[]) {
  const rows = await db.highlight.groupBy({ by: ["sourceId"], where: { source: { projectId: { in: projectIds } } }, _count: { _all: true } });
  const sources = await db.source.findMany({ where: { id: { in: rows.map((r) => r.sourceId) } }, select: { id: true, projectId: true } });
  const bySource = new Map(sources.map((s) => [s.id, s.projectId]));
  const out = new Map<string, number>();
  for (const r of rows) {
    const pid = bySource.get(r.sourceId);
    if (pid) out.set(pid, (out.get(pid) ?? 0) + r._count._all);
  }
  return out;
}

export async function listProductAreas() {
  const rows = await db.project.findMany({ where: { productArea: { not: null } }, distinct: ["productArea"], select: { productArea: true }, orderBy: { productArea: "asc" } });
  return rows.map((r) => r.productArea!).filter(Boolean);
}

/** Project detail with the viewer's role, or null when the project is hidden from them. */
export async function getProjectForUser(user: User, projectId: string) {
  const { project, role } = await getProjectRole(user, projectId);
  if (!project || !role) return null;
  const [full, highlightCounts] = await Promise.all([
    db.project.findUniqueOrThrow({
      where: { id: projectId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { user: { name: "asc" } } },
        sources: {
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          include: {
            participants: { include: { participant: { select: { id: true, name: true, role: true, company: true } } } },
            _count: { select: { segments: true, highlights: true } },
          },
        },
      },
    }),
    db.highlight.count({ where: { source: { projectId } } }),
  ]);
  // Participants of the project = union over its sources.
  const participants = new Map<string, { id: string; name: string; role: string | null; company: string | null; sourceCount: number }>();
  for (const s of full.sources) {
    for (const sp of s.participants) {
      const p = participants.get(sp.participant.id) ?? { ...sp.participant, sourceCount: 0 };
      p.sourceCount++;
      participants.set(p.id, p);
    }
  }
  return { project: full, role, highlightCount: highlightCounts, participants: [...participants.values()].sort((a, b) => a.name.localeCompare(b.name)) };
}
