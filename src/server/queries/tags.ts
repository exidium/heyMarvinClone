import "server-only";
import { db } from "@/lib/db";

export const tagSelect = { id: true, name: true, color: true, archivedAt: true, group: { select: { id: true, name: true, color: true } } } as const;

/** Active tags for pickers, grouped order then name. */
export async function listTagsForPicker() {
  return db.tag.findMany({ where: { archivedAt: null }, orderBy: [{ group: { position: "asc" } }, { name: "asc" }], select: tagSelect });
}

/** Everything the admin tag manager needs: groups in order, tags with usage counts, including archived. */
export async function listTagsAdmin() {
  const [groups, tags] = await Promise.all([
    db.tagGroup.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] }),
    db.tag.findMany({ orderBy: { name: "asc" }, select: { ...tagSelect, description: true, externalIds: true, _count: { select: { highlights: true } } } }),
  ]);
  return { groups, tags };
}
