/** Shape of demo/public/data.json (exported by scripts/export-demo-data.ts) and derived lookups. */
export type Project = { id: string; name: string; goal: string | null; productArea: string | null; startDate: string | null; endDate: string | null; ownerName: string | null };
export type Source = { id: string; projectId: string; title: string; date: string | null; kind: string; status: string; participants: { participantId: string; speakerLabel: string | null }[] };
export type Segment = { id: string; sourceId: string; order: number; speaker: string | null; startMs: number | null; endMs: number | null; text: string };
export type Highlight = { id: string; sourceId: string; startSegmentId: string; startOffset: number; endSegmentId: string; endOffset: number; text: string; createdAt: string; tags: { tagId: string }[] };
export type Tag = { id: string; name: string; color: string | null; groupId: string | null };
export type Group = { id: string; name: string; color: string | null };
export type Participant = { id: string; name: string; role: string | null; company: string | null; segment: string | null; toolsUsed: string[]; notes: string | null };
export type Theme = { id: string; title: string; description: string | null; confidence: "LOW" | "MEDIUM" | "HIGH" | null; productArea: string | null; parentId: string | null; highlightIds: string[] };
export type Data = { generatedAt: string; note: string; projects: Project[]; sources: Source[]; segments: Segment[]; highlights: Highlight[]; tags: Tag[]; groups: Group[]; participants: Participant[]; themes: Theme[] };

export type Index = ReturnType<typeof buildIndex>;

export function buildIndex(d: Data) {
  const projects = new Map(d.projects.map((p) => [p.id, p]));
  const sources = new Map(d.sources.map((s) => [s.id, s]));
  const segments = new Map(d.segments.map((s) => [s.id, s]));
  const tags = new Map(d.tags.map((t) => [t.id, t]));
  const groups = new Map(d.groups.map((g) => [g.id, g]));
  const participants = new Map(d.participants.map((p) => [p.id, p]));
  const segmentsBySource = new Map<string, Segment[]>();
  for (const s of d.segments) segmentsBySource.set(s.sourceId, [...(segmentsBySource.get(s.sourceId) ?? []), s]);
  for (const list of segmentsBySource.values()) list.sort((a, b) => a.order - b.order);
  const highlightsBySource = new Map<string, Highlight[]>();
  for (const h of d.highlights) highlightsBySource.set(h.sourceId, [...(highlightsBySource.get(h.sourceId) ?? []), h]);
  const sourcesByProject = new Map<string, Source[]>();
  for (const s of d.sources) sourcesByProject.set(s.projectId, [...(sourcesByProject.get(s.projectId) ?? []), s]);
  const themesOfHighlight = new Map<string, Theme[]>();
  for (const t of d.themes) for (const hid of t.highlightIds) themesOfHighlight.set(hid, [...(themesOfHighlight.get(hid) ?? []), t]);
  return { data: d, projects, sources, segments, tags, groups, participants, segmentsBySource, highlightsBySource, sourcesByProject, themesOfHighlight };
}

/** websearch-like matching: quoted phrases, -excluded words, remaining words must all appear. */
export function matchesQuery(text: string, q: string): boolean {
  const t = text.toLowerCase();
  const terms = q.toLowerCase().match(/-?"[^"]+"|\S+/g) ?? [];
  for (const raw of terms) {
    const neg = raw.startsWith("-");
    const term = raw.replace(/^-/, "").replace(/^"|"$/g, "");
    if (!term) continue;
    const hit = t.includes(term);
    if (neg ? hit : !hit) return false;
  }
  return true;
}

/** Colour for a tag id, falling back to a hash of its group or name. */
export function tagColorOf(ix: Index, tagId: string): string {
  const t = ix.tags.get(tagId);
  if (!t) return "#9ca3af";
  if (t.color) return t.color;
  const g = t.groupId ? ix.groups.get(t.groupId) : null;
  return g?.color ?? hashColor(g?.name ?? t.name);
}
const PALETTE = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16", "#06b6d4"];
export function hashColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
export const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" }) : "");
