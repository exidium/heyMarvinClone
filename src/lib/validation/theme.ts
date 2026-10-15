import { z } from "zod";
import { idSchema, optionalText } from "./common";

export const ConfidenceSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const ThemeFieldsSchema = z.object({
  title: z.string().trim().min(1, "State the finding").max(300),
  description: optionalText(5000),
  confidence: ConfidenceSchema.nullable().optional(),
  productArea: optionalText(100),
  parentId: idSchema.nullable().optional(),
});
export const CreateThemeSchema = ThemeFieldsSchema;
export const UpdateThemeSchema = ThemeFieldsSchema.partial().extend({ id: idSchema });
export const DeleteThemeSchema = z.object({ id: idSchema });
export const MoveThemeSchema = z.object({ id: idSchema, parentId: idSchema.nullable() });
export const AddToThemeSchema = z.object({ themeId: idSchema, highlightIds: z.array(idSchema).min(1).max(200) });
export const RemoveFromThemeSchema = z.object({ themeId: idSchema, highlightId: idSchema });
export const HighlightContextSchema = z.object({ highlightId: idSchema });
