import "server-only";
import { db } from "@/lib/db";

export const tagSelect = { id: true, name: true, color: true, archivedAt: true, group: { select: { id: true, name: true, color: true } } } as const;

/** Active tags for pickers, grouped order then name. */
export async function listTagsForPicker() {
  return db.tag.findMany({ where: { archivedAt: null }, orderBy: [{ group: { position: "asc" } }, { name: "asc" }], select: tagSelect });
}
