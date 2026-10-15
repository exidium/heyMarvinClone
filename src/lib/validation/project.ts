import { z } from "zod";
import { dateInput, idSchema, optionalText } from "./common";

export const ProjectAccessSchema = z.enum(["OPEN", "RESTRICTED"]);
export const ProjectRoleSchema = z.enum(["ADMIN", "EDITOR", "VIEWER"]);

export const ProjectFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  goal: optionalText(5000),
  productArea: optionalText(100),
  startDate: dateInput,
  endDate: dateInput,
  access: ProjectAccessSchema.default("OPEN"),
});

export const CreateProjectSchema = ProjectFieldsSchema;
export const UpdateProjectSchema = ProjectFieldsSchema.partial().extend({ id: idSchema });
export const SetProjectArchivedSchema = z.object({ id: idSchema, archived: z.boolean() });
export const DeleteProjectSchema = z.object({ id: idSchema });

export const AddMemberSchema = z.object({ projectId: idSchema, email: z.string().trim().email(), role: ProjectRoleSchema });
export const UpdateMemberSchema = z.object({ projectId: idSchema, userId: idSchema, role: ProjectRoleSchema });
export const RemoveMemberSchema = z.object({ projectId: idSchema, userId: idSchema });

export type ProjectFields = z.input<typeof ProjectFieldsSchema>;
