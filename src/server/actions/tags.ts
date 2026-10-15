"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { AuthzError, requireAdmin } from "@/lib/authz";
import { authedAction } from "@/server/action";
import { CreateTagSchema } from "@/lib/validation/highlight";
import {
  CreateTagGroupSchema, DeleteTagGroupSchema, DeleteTagSchema, MergeTagsSchema, ReorderTagGroupsSchema,
  SetTagArchivedSchema, UpdateTagGroupSchema, UpdateTagSchema,
} from "@/lib/validation/tag";
import { tagSelect } from "@/server/queries/tags";

const refresh = () => revalidatePath("/", "layout");

/** Any signed-in editor may create a tag while highlighting (decision D15). Case-insensitively unique. */
export const createTag = authedAction(CreateTagSchema, async ({ name, groupId }) => {
  const existing = await db.tag.findFirst({ where: { name: { equals: name, mode: "insensitive" } }, select: tagSelect });
  if (existing) {
    if (existing.archivedAt) throw new AuthzError(`Tag "${existing.name}" is archived; ask an admin to restore it`);
    return existing;
  }
  return db.tag.create({ data: { name, groupId: groupId ?? null }, select: tagSelect });
});

// ---------- admin: groups ----------

export const createTagGroup = authedAction(CreateTagGroupSchema, async ({ name, color }, { user }) => {
  requireAdmin(user);
  const last = await db.tagGroup.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
  const g = await db.tagGroup.create({ data: { name, color: color ?? null, position: (last?.position ?? -1) + 1 } });
  refresh();
  return g;
});

export const updateTagGroup = authedAction(UpdateTagGroupSchema, async ({ id, ...data }, { user }) => {
  requireAdmin(user);
  const g = await db.tagGroup.update({ where: { id }, data });
  refresh();
  return g;
});

/** Deleting a group keeps its tags (they become ungrouped). */
export const deleteTagGroup = authedAction(DeleteTagGroupSchema, async ({ id }, { user }) => {
  requireAdmin(user);
  await db.tagGroup.delete({ where: { id } });
  refresh();
  return { id };
});

export const reorderTagGroups = authedAction(ReorderTagGroupsSchema, async ({ orderedIds }, { user }) => {
  requireAdmin(user);
  await db.$transaction(orderedIds.map((id, i) => db.tagGroup.update({ where: { id }, data: { position: i } })));
  refresh();
  return { ok: true };
});

// ---------- admin: tags ----------

export const updateTag = authedAction(UpdateTagSchema, async ({ id, ...data }, { user }) => {
  requireAdmin(user);
  if (data.name) {
    const clash = await db.tag.findFirst({ where: { name: { equals: data.name, mode: "insensitive" }, NOT: { id } }, select: { name: true } });
    if (clash) throw new AuthzError(`A tag named "${clash.name}" already exists. Merge them instead.`);
  }
  const t = await db.tag.update({ where: { id }, data, select: tagSelect });
  refresh();
  return t;
});

/**
 * Merge: every highlight tagged with the source becomes tagged with the target (duplicates collapse),
 * the source's external ids move to the target, and the source is deleted.
 */
export const mergeTags = authedAction(MergeTagsSchema, async ({ sourceId, targetId }, { user }) => {
  requireAdmin(user);
  const [source, target] = await Promise.all([db.tag.findUnique({ where: { id: sourceId } }), db.tag.findUnique({ where: { id: targetId } })]);
  if (!source || !target) throw new AuthzError("Tag not found");
  const moved = await db.$transaction(async (tx) => {
    const n = await tx.$executeRaw`
      INSERT INTO "HighlightTag" ("highlightId", "tagId", "createdAt")
      SELECT "highlightId", ${targetId}, "createdAt" FROM "HighlightTag" WHERE "tagId" = ${sourceId}
      ON CONFLICT DO NOTHING`;
    await tx.tag.update({ where: { id: targetId }, data: { externalIds: { push: source.externalIds } } });
    await tx.tag.delete({ where: { id: sourceId } }); // cascades the old HighlightTag rows
    return n;
  });
  refresh();
  return { targetId, moved };
});

export const setTagArchived = authedAction(SetTagArchivedSchema, async ({ id, archived }, { user }) => {
  requireAdmin(user);
  const t = await db.tag.update({ where: { id }, data: { archivedAt: archived ? new Date() : null }, select: tagSelect });
  refresh();
  return t;
});

/** Deleting a tag removes it from every highlight. Admin only; archive is the safer default. */
export const deleteTag = authedAction(DeleteTagSchema, async ({ id }, { user }) => {
  requireAdmin(user);
  await db.tag.delete({ where: { id } });
  refresh();
  return { id };
});
