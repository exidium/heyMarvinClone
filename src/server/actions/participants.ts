"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { authedAction } from "@/server/action";
import {
  CreateParticipantSchema, DeleteParticipantSchema, SearchParticipantsSchema, UpdateParticipantSchema,
} from "@/lib/validation/participant";

const refresh = () => revalidatePath("/", "layout");

export const createParticipant = authedAction(CreateParticipantSchema, async (input) => {
  const p = await db.participant.create({ data: input, select: { id: true, name: true, role: true, company: true, segment: true } });
  refresh();
  return p;
});

export const updateParticipant = authedAction(UpdateParticipantSchema, async ({ id, ...data }) => {
  const p = await db.participant.update({ where: { id }, data, select: { id: true } });
  refresh();
  return p;
});

/** Participant data is personal data: only global admins may delete it (spec open question). */
export const deleteParticipant = authedAction(DeleteParticipantSchema, async ({ id }, { user }) => {
  requireAdmin(user);
  await db.participant.delete({ where: { id } });
  refresh();
  return { id };
});

/** Used by the participant picker. */
export const searchParticipants = authedAction(SearchParticipantsSchema, async ({ q, excludeIds }) => {
  return db.participant.findMany({
    where: {
      id: { notIn: excludeIds },
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { company: { contains: q, mode: "insensitive" } }, { role: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { name: "asc" },
    take: 20,
    select: { id: true, name: true, role: true, company: true, segment: true },
  });
});
