"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { AuthzError } from "@/lib/authz";
import { authedAction } from "@/server/action";
import { CreateSavedViewSchema, DeleteSavedViewSchema } from "@/lib/validation/search";

export const createSavedView = authedAction(CreateSavedViewSchema, async ({ name, isShared, filters }, { user }) => {
  const { page: _page, ...rest } = filters;
  void _page;
  const view = await db.savedView.create({ data: { name, isShared, ownerId: user.id, filters: rest }, select: { id: true } });
  revalidatePath("/", "layout");
  return view;
});

export const deleteSavedView = authedAction(DeleteSavedViewSchema, async ({ id }, { user }) => {
  const view = await db.savedView.findUnique({ where: { id }, select: { ownerId: true } });
  if (!view) throw new AuthzError("View not found");
  if (view.ownerId !== user.id && !user.isAdmin) throw new AuthzError("Only the owner can delete this view");
  await db.savedView.delete({ where: { id } });
  revalidatePath("/", "layout");
  return { id };
});
