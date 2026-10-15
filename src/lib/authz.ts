import "server-only";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { Prisma, Project, ProjectRole, User } from "@/generated/prisma/client";

export class AuthzError extends Error {
  constructor(message = "You do not have permission to do that") {
    super(message);
    this.name = "AuthzError";
  }
}

export const ROLE_RANK: Record<ProjectRole, number> = { VIEWER: 1, EDITOR: 2, ADMIN: 3 };

export function roleAtLeast(role: ProjectRole | null, min: ProjectRole): boolean {
  return role !== null && ROLE_RANK[role] >= ROLE_RANK[min];
}

/**
 * Pure role resolution (unit-tested):
 * - global admins and the project owner are ADMIN of the project
 * - an explicit membership wins next
 * - OPEN projects grant everyone VIEWER
 * - RESTRICTED projects without membership grant nothing
 */
export function resolveRole(
  user: Pick<User, "id" | "isAdmin">,
  project: Pick<Project, "ownerId" | "access">,
  membershipRole: ProjectRole | null,
): ProjectRole | null {
  if (user.isAdmin || project.ownerId === user.id) return "ADMIN";
  if (membershipRole) return membershipRole;
  if (project.access === "OPEN") return "VIEWER";
  return null;
}

export async function getProjectRole(user: Pick<User, "id" | "isAdmin">, projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { members: { where: { userId: user.id }, select: { role: true } } },
  });
  if (!project) return { project: null, role: null } as const;
  return { project, role: resolveRole(user, project, project.members[0]?.role ?? null) } as const;
}

/** Resolves the current user and enforces a minimum role on a project. Throws AuthzError. */
export async function requireProjectRole(projectId: string, min: ProjectRole) {
  const user = await requireUser();
  const { project, role } = await getProjectRole(user, projectId);
  if (!project || !roleAtLeast(role, min)) throw new AuthzError();
  return { user, project, role: role! };
}

/** Prisma `where` fragment: projects the user may see at all. */
export function visibleProjectsWhere(user: Pick<User, "id" | "isAdmin">): Prisma.ProjectWhereInput {
  if (user.isAdmin) return {};
  return { OR: [{ access: "OPEN" }, { ownerId: user.id }, { members: { some: { userId: user.id } } }] };
}

/** Only global admins may create projects, manage users, manage the tag list and delete data. */
export function requireAdmin(user: Pick<User, "isAdmin">) {
  if (!user.isAdmin) throw new AuthzError("Admin only");
}

// ---- helpers to find the project behind a child entity ----

export async function projectIdOfSource(sourceId: string) {
  const s = await db.source.findUnique({ where: { id: sourceId }, select: { projectId: true } });
  if (!s) throw new AuthzError("Source not found");
  return s.projectId;
}

export async function projectIdOfHighlight(highlightId: string) {
  const h = await db.highlight.findUnique({
    where: { id: highlightId },
    select: { source: { select: { projectId: true } } },
  });
  if (!h) throw new AuthzError("Highlight not found");
  return h.source.projectId;
}

export async function projectIdOfSegment(segmentId: string) {
  const s = await db.segment.findUnique({
    where: { id: segmentId },
    select: { source: { select: { projectId: true } } },
  });
  if (!s) throw new AuthzError("Segment not found");
  return s.source.projectId;
}
