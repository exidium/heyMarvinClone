/** Deterministic fallback colours for tag groups and tags that have none set. */
const PALETTE = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16", "#06b6d4"];

export function colorFor(key: string | null | undefined): string {
  if (!key) return "#9ca3af";
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export type TagLike = { id: string; name: string; color: string | null; group: { id: string; name: string; color: string | null } | null };

/** Colour of a tag: its own, else its group's, else a hash of the group (or tag) name. */
export function tagColor(t: TagLike): string {
  return t.color ?? t.group?.color ?? colorFor(t.group?.name ?? t.name);
}

/** Colour of a highlight: its first tag's colour, else neutral. */
export function highlightColor(tags: TagLike[]): string | null {
  return tags.length ? tagColor(tags[0]) : null;
}
