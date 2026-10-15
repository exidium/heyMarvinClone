import { z } from "zod";
import { idSchema, optionalText, stringList } from "./common";

export const ParticipantFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name or alias is required").max(200),
  role: optionalText(120),
  company: optionalText(200),
  segment: optionalText(120),
  toolsUsed: stringList,
  notes: optionalText(5000),
});

export const CreateParticipantSchema = ParticipantFieldsSchema;
export const UpdateParticipantSchema = ParticipantFieldsSchema.partial().extend({ id: idSchema });
export const DeleteParticipantSchema = z.object({ id: idSchema });
export const SearchParticipantsSchema = z.object({ q: z.string().trim().max(200).default(""), excludeIds: z.array(idSchema).default([]) });

export type ParticipantFields = z.input<typeof ParticipantFieldsSchema>;
