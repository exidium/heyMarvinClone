import "server-only";
import { db } from "@/lib/db";
import { visibleProjectsWhere } from "@/lib/authz";
import type { User } from "@/generated/prisma/client";
import { listTagsForPicker } from "@/server/queries/tags";
import { participantFacets } from "@/server/queries/participants";
import { listProductAreas } from "@/server/queries/projects";

/** Everything the filter bar offers to choose from. */
export async function searchFacets(user: User) {
  const [projects, productAreas, tags, participants] = await Promise.all([
    db.project.findMany({ where: visibleProjectsWhere(user), orderBy: { name: "asc" }, select: { id: true, name: true } }),
    listProductAreas(),
    listTagsForPicker(),
    participantFacets(),
  ]);
  return { projects, productAreas, tags, participants };
}
export type SearchFacets = Awaited<ReturnType<typeof searchFacets>>;
