import type { TagLike } from "@/lib/colors";

export type HighlightRow = {
  id: string; startSegmentId: string; startOffset: number; endSegmentId: string; endOffset: number;
  text: string; status: "ACTIVE" | "ORPHANED"; note: string | null; createdAt: Date;
  createdBy: { id: string; name: string | null; email: string } | null;
  tags: { tag: TagLike & { archivedAt?: Date | null } }[];
};

export type ClientHighlight = Omit<HighlightRow, "tags"> & { tags: TagLike[] };

export const toClient = (h: HighlightRow): ClientHighlight => ({ ...h, tags: h.tags.map((t) => t.tag) });
