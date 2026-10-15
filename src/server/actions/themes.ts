"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { AuthzError, visibleProjectsWhere } from "@/lib/authz";
import { authedAction } from "@/server/action";
import { AddToThemeSchema, CreateThemeSchema, DeleteThemeSchema, HighlightContextSchema, MoveThemeSchema, RemoveFromThemeSchema, UpdateThemeSchema } from "@/lib/validation/theme";
import { highlightContext } from "@/server/queries/explore";

const refresh = () => revalidatePath("/explore");
const themeSelect = { id: true, title: true, description: true, confidence: true, productArea: true, parentId: true } as const;

/** Any signed-in user may create a theme (decision D46); only its creator or an admin may delete it. */
export const createTheme = authedAction(CreateThemeSchema, async (input, { user }) => {
  const last = await db.theme.findFirst({ where: { parentId: input.parentId ?? null }, orderBy: { position: "desc" }, select: { position: true } });
  const t = await db.theme.create({ data: { ...input, parentId: input.parentId ?? null, confidence: input.confidence ?? null, position: (last?.position ?? -1) + 1, createdById: user.id }, select: themeSelect });
  refresh();
  return t;
});

export const updateTheme = authedAction(UpdateThemeSchema, async ({ id, ...data }) => {
  const t = await db.theme.update({ where: { id }, data, select: themeSelect });
  refresh();
  return t;
});

export const moveTheme = authedAction(MoveThemeSchema, async ({ id, parentId }) => {
  if (parentId === id) throw new AuthzError("A theme cannot be its own parent");
  // Refuse cycles: walk up from the new parent.
  let cur = parentId;
  while (cur) {
    const p = await db.theme.findUnique({ where: { id: cur }, select: { parentId: true } });
    if (!p) break;
    if (p.parentId === id) throw new AuthzError("That would make a loop");
    cur = p.parentId;
  }
  await db.theme.update({ where: { id }, data: { parentId } });
  refresh();
  return { id };
});

export const deleteTheme = authedAction(DeleteThemeSchema, async ({ id }, { user }) => {
  const t = await db.theme.findUnique({ where: { id }, select: { createdById: true } });
  if (!t) throw new AuthzError("Theme not found");
  if (t.createdById !== user.id && !user.isAdmin) throw new AuthzError("Only the creator or an admin can delete a theme");
  // Children move up one level; highlight links are removed by cascade.
  await db.$transaction([
    db.theme.updateMany({ where: { parentId: id }, data: { parentId: null } }),
    db.theme.delete({ where: { id } }),
  ]);
  refresh();
  return { id };
});

export const addToTheme = authedAction(AddToThemeSchema, async ({ themeId, highlightIds }, { user }) => {
  const visible = await db.highlight.findMany({ where: { id: { in: highlightIds }, source: { project: visibleProjectsWhere(user) } }, select: { id: true } });
  if (!visible.length) throw new AuthzError("No visible highlights to add");
  const last = await db.themeHighlight.findFirst({ where: { themeId }, orderBy: { position: "desc" }, select: { position: true } });
  let pos = (last?.position ?? -1) + 1;
  await db.themeHighlight.createMany({ data: visible.map((h) => ({ themeId, highlightId: h.id, addedById: user.id, position: pos++ })), skipDuplicates: true });
  refresh();
  return { themeId, added: visible.length };
});

export const removeFromTheme = authedAction(RemoveFromThemeSchema, async ({ themeId, highlightId }) => {
  await db.themeHighlight.deleteMany({ where: { themeId, highlightId } });
  refresh();
  return { themeId, highlightId };
});

/** Detail pane data, fetched on selection so keyboard navigation stays client-side. */
export const getHighlightContext = authedAction(HighlightContextSchema, async ({ highlightId }, { user }) => {
  const ctx = await highlightContext(user, highlightId);
  if (!ctx) throw new AuthzError("Highlight not found");
  return ctx;
});
