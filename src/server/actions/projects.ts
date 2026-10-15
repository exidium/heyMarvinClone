"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { AuthzError, requireAdmin } from "@/lib/authz";
import { authedAction, projectAction } from "@/server/action";
import {
  AddMemberSchema, CreateProjectSchema, DeleteProjectSchema, RemoveMemberSchema,
  SetProjectArchivedSchema, UpdateMemberSchema, UpdateProjectSchema,
} from "@/lib/validation/project";

const refresh = () => revalidatePath("/", "layout");

/** Any signed-in user may create a project and becomes its owner (project ADMIN). See decision D22. */
export const createProject = authedAction(CreateProjectSchema, async (input, { user }) => {
  const project = await db.project.create({ data: { ...input, ownerId: user.id }, select: { id: true } });
  refresh();
  return project;
});

export const updateProject = projectAction(UpdateProjectSchema, "ADMIN", (i) => i.id, async ({ id, ...data }) => {
  const project = await db.project.update({ where: { id }, data, select: { id: true } });
  refresh();
  return project;
});

export const setProjectArchived = projectAction(SetProjectArchivedSchema, "ADMIN", (i) => i.id, async ({ id, archived }) => {
  await db.project.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
  refresh();
  return { id };
});

/** Deleting a project removes its sources, segments and highlights. Global admins only (D15). */
export const deleteProject = projectAction(DeleteProjectSchema, "ADMIN", (i) => i.id, async ({ id }, { user }) => {
  requireAdmin(user);
  await db.project.delete({ where: { id } });
  refresh();
  return { id };
});

export const addMember = projectAction(AddMemberSchema, "ADMIN", (i) => i.projectId, async ({ projectId, email, role }) => {
  const target = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!target) throw new AuthzError(`No user with email ${email}`);
  await db.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: target.id } },
    update: { role },
    create: { projectId, userId: target.id, role },
  });
  refresh();
  return { userId: target.id };
});

export const updateMember = projectAction(UpdateMemberSchema, "ADMIN", (i) => i.projectId, async ({ projectId, userId, role }) => {
  await db.projectMember.update({ where: { projectId_userId: { projectId, userId } }, data: { role } });
  refresh();
  return { userId };
});

export const removeMember = projectAction(RemoveMemberSchema, "ADMIN", (i) => i.projectId, async ({ projectId, userId }) => {
  await db.projectMember.delete({ where: { projectId_userId: { projectId, userId } } });
  refresh();
  return { userId };
});
