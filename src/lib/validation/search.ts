import { z } from "zod";

/** The one filter shape used by the URL, the search query and saved views. */
export const SearchFiltersSchema = z.object({
  q: z.string().trim().max(300).default(""),
  scope: z.enum(["highlights", "transcript"]).default("highlights"),
  projectIds: z.array(z.string()).max(100).default([]),
  productAreas: z.array(z.string()).max(50).default([]),
  tagIds: z.array(z.string()).max(50).default([]),
  tagMode: z.enum(["any", "all"]).default("any"),
  roles: z.array(z.string()).max(50).default([]),
  companies: z.array(z.string()).max(50).default([]),
  segments: z.array(z.string()).max(50).default([]),
  tools: z.array(z.string()).max(50).default([]),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  page: z.number().int().min(1).default(1),
});
export type SearchFilters = z.output<typeof SearchFiltersSchema>;

export const EMPTY_FILTERS: SearchFilters = SearchFiltersSchema.parse({});

/** True when any filter besides paging and scope is set. */
export function hasAnyFilter(f: SearchFilters) {
  return !!(f.q || f.projectIds.length || f.productAreas.length || f.tagIds.length || f.roles.length || f.companies.length || f.segments.length || f.tools.length || f.dateFrom || f.dateTo);
}

export const CreateSavedViewSchema = z.object({ name: z.string().trim().min(1).max(120), isShared: z.boolean().default(false), filters: SearchFiltersSchema });
export const DeleteSavedViewSchema = z.object({ id: z.string().min(1) });
