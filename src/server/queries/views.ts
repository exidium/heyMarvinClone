import "server-only";
import { db } from "@/lib/db";
import type { User } from "@/generated/prisma/client";

/** Own views plus shared ones, own first. */
export async function listSavedViews(user: User) {
  return db.savedView.findMany({
    where: { OR: [{ ownerId: user.id }, { isShared: true }] },
    orderBy: [{ ownerId: "asc" }, { name: "asc" }],
    select: { id: true, name: true, isShared: true, ownerId: true, filters: true },
  });
}

export async function getSavedView(user: User, id: string) {
  return db.savedView.findFirst({ where: { id, OR: [{ ownerId: user.id }, { isShared: true }] }, select: { id: true, name: true, isShared: true, ownerId: true, filters: true } });
}
