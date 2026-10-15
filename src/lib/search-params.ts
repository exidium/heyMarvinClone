import { createLoader, createSerializer, parseAsArrayOf, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs/server";
import { SearchFiltersSchema, type SearchFilters } from "@/lib/validation/search";

/** URL ⇄ SearchFilters. Shared by the search page (server), the filter bar (client) and saved views. */
export const searchParsers = {
  q: parseAsString.withDefault(""),
  scope: parseAsStringLiteral(["highlights", "transcript"] as const).withDefault("highlights"),
  projectIds: parseAsArrayOf(parseAsString).withDefault([]),
  productAreas: parseAsArrayOf(parseAsString).withDefault([]),
  tagIds: parseAsArrayOf(parseAsString).withDefault([]),
  tagMode: parseAsStringLiteral(["any", "all"] as const).withDefault("any"),
  roles: parseAsArrayOf(parseAsString).withDefault([]),
  companies: parseAsArrayOf(parseAsString).withDefault([]),
  segments: parseAsArrayOf(parseAsString).withDefault([]),
  tools: parseAsArrayOf(parseAsString).withDefault([]),
  dateFrom: parseAsString,
  dateTo: parseAsString,
  page: parseAsInteger.withDefault(1),
};

export const urlKeys = { projectIds: "project", productAreas: "area", tagIds: "tag", tagMode: "tags", companies: "company", roles: "role", segments: "segment", tools: "tool", dateFrom: "from", dateTo: "to" } as const;

export const loadSearchFilters = createLoader(searchParsers, { urlKeys });
export const serializeSearch = createSerializer(searchParsers, { urlKeys });

/** Validates what came from the URL or a saved view into the canonical shape. */
export function toFilters(raw: unknown): SearchFilters {
  const parsed = SearchFiltersSchema.safeParse(raw);
  return parsed.success ? parsed.data : SearchFiltersSchema.parse({});
}

export function searchHref(f: Partial<SearchFilters>) {
  return serializeSearch("/search", f);
}
