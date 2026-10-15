"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { AuthzError, requireAdmin } from "@/lib/authz";
import { hashPassword } from "@/lib/password";
import { authedAction } from "@/server/action";
import { CreateUserSchema, DeleteUserSchema, SetAdminSchema, SetPasswordSchema } from "@/lib/validation/auth";

const refresh = () => revalidatePath("/users");

export const createUser = authedAction(CreateUserSchema, async ({ email, name, password, isAdmin }, { user }) => {
  requireAdmin(user);
  const exists = await db.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
  if (exists) throw new AuthzError("A user with that email already exists");
  const created = await db.user.create({ data: { email: email.toLowerCase(), name, isAdmin, passwordHash: await hashPassword(password) }, select: { id: true } });
  refresh();
  return created;
});

export const setPassword = authedAction(SetPasswordSchema, async ({ userId, password }, { user }) => {
  requireAdmin(user);
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } });
  await db.session.deleteMany({ where: { userId } }); // sign the user out everywhere
  return { userId };
});

export const setAdmin = authedAction(SetAdminSchema, async ({ userId, isAdmin }, { user }) => {
  requireAdmin(user);
  if (userId === user.id && !isAdmin) throw new AuthzError("You cannot remove your own admin role");
  await db.user.update({ where: { id: userId }, data: { isAdmin } });
  refresh();
  return { userId };
});

/** Removes the account; their projects stay (owner reassigned to the acting admin), their highlights keep text. */
export const deleteUser = authedAction(DeleteUserSchema, async ({ userId }, { user }) => {
  requireAdmin(user);
  if (userId === user.id) throw new AuthzError("You cannot delete yourself");
  await db.$transaction([
    db.project.updateMany({ where: { ownerId: userId }, data: { ownerId: user.id } }),
    db.user.delete({ where: { id: userId } }),
  ]);
  refresh();
  return { userId };
});
