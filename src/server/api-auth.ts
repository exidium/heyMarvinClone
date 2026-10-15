import "server-only";
import { AuthError, requireUser } from "@/lib/auth";
import { AuthzError, projectIdOfSource, requireProjectRole } from "@/lib/authz";
import type { ProjectRole } from "@/generated/prisma/client";

/** Route-handler twin of projectAction: resolves the source's project and enforces a role, or returns a Response. */
export async function guardSource(sourceId: string, min: ProjectRole) {
  try {
    await requireUser(); // 401 before any lookup, so anonymous callers learn nothing
    const projectId = await projectIdOfSource(sourceId);
    return await requireProjectRole(projectId, min);
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: "Not signed in" }, { status: 401 });
    if (e instanceof AuthzError) return Response.json({ error: e.message }, { status: e.message.includes("not found") ? 404 : 403 });
    throw e;
  }
}
