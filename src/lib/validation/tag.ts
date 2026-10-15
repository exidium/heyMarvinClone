import { z } from "zod";
import { idSchema, optionalText } from "./common";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional();

export const CreateTagGroupSchema = z.object({ name: z.string().trim().min(1).max(100), color });
export const UpdateTagGroupSchema = z.object({ id: idSchema, name: z.string().trim().min(1).max(100).optional(), color });
export const DeleteTagGroupSchema = z.object({ id: idSchema });
export const ReorderTagGroupsSchema = z.object({ orderedIds: z.array(idSchema).max(200) });

export const UpdateTagSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(100).optional(),
  groupId: idSchema.nullable().optional(),
  color,
  description: optionalText(500).optional(),
});
export const MergeTagsSchema = z.object({ sourceId: idSchema, targetId: idSchema }).refine((v) => v.sourceId !== v.targetId, { message: "Pick two different tags" });
export const SetTagArchivedSchema = z.object({ id: idSchema, archived: z.boolean() });
export const DeleteTagSchema = z.object({ id: idSchema });
