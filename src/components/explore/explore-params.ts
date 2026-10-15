import { parseAsString, parseAsStringLiteral } from "nuqs";
import { PIVOTS } from "@/lib/explore";

/** URL state of the explorer: pivot, selected node key, keyword, selected highlight. */
export const exploreParsers = {
  pivot: parseAsStringLiteral(PIVOTS).withDefault("projects"),
  node: parseAsString.withDefault(""),
  q: parseAsString.withDefault(""),
  h: parseAsString,
};
