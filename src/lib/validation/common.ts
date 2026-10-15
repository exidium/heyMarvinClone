import { z } from "zod";

export const idSchema = z.string().min(1, "Required");

/** Accepts "yyyy-mm-dd", an ISO string, an empty string or null; yields Date | null. */
export const dateInput = z
  .union([z.string(), z.date(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null || v === "") return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  });

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const stringList = z.array(z.string().trim().min(1).max(80)).max(50).default([]);
