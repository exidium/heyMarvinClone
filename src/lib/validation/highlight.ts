import { z } from "zod";
import { idSchema } from "./common";

export const AnchorsSchema = z.object({
  startSegmentId: idSchema,
  startOffset: z.number().int().min(0),
  endSegmentId: idSchema,
  endOffset: z.number().int().min(0),
});

export const CreateHighlightSchema = AnchorsSchema.extend({
  sourceId: idSchema,
  tagIds: z.array(idSchema).max(20).default([]),
});

export const SetHighlightTagsSchema = z.object({ highlightId: idSchema, tagIds: z.array(idSchema).max(20) });
export const DeleteHighlightSchema = z.object({ highlightId: idSchema });
export const SetHighlightNoteSchema = z.object({ highlightId: idSchema, note: z.string().trim().max(5000).nullable() });

export const SaveSegmentSchema = z.object({
  segmentId: idSchema,
  version: z.number().int().min(1),
  text: z.string().max(20000),
  marks: z.array(z.object({ highlightId: idSchema, from: z.number().int().min(0), to: z.number().int().min(0) })).max(500),
});

export const RenameSpeakerSchema = z.object({
  sourceId: idSchema,
  segmentId: idSchema,
  scope: z.enum(["one", "all"]),
  speaker: z.string().trim().max(120).nullable(),
  participantId: idSchema.nullable().optional(),
});

export const CreateTagSchema = z.object({ name: z.string().trim().min(1).max(100), groupId: idSchema.nullable().optional() });
