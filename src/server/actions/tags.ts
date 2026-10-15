"use server";

import { db } from "@/lib/db";
import { AuthzError } from "@/lib/authz";
import { authedAction } from "@/server/action";
import { CreateTagSchema } from "@/lib/validation/highlight";
import { tagSelect } from "@/server/queries/tags";

/** Any signed-in editor may create a tag while highlighting (decision D15). Case-insensitively unique. */
export const createTag = authedAction(CreateTagSchema, async ({ name, groupId }) => {
  const existing = await db.tag.findFirst({ where: { name: { equals: name, mode: "insensitive" } }, select: tagSelect });
  if (existing) {
    if (existing.archivedAt) throw new AuthzError(`Tag "${existing.name}" is archived; ask an admin to restore it`);
    return existing;
  }
  return db.tag.create({ data: { name, groupId: groupId ?? null }, select: tagSelect });
});
