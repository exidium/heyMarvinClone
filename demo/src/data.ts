/** Shape of demo/public/data.json (exported by scripts/export-demo-data.ts) and derived lookups. */
export type Project = { id: string; name: string; productArea: string | null; startDate: string | null };
export type Source = { id: string; projectId: string; title: string; date: string | null; kind: string; participants: { participantId: string; speakerLabel: string | null }[] };
export type Segment = { id: string; sourceId: string; order: number; speaker: string | null; startMs: number | null; text: string };
export type Highlight = { id: string; sourceId: string; startSegmentId: string; startOffset: number; endSegmentId: string; endOffset: number; text: string; createdAt: string; tags: { tagId: string }[] };
export type Tag = { id: string; name: string; color: string | null; groupId: string | null };
export type Group = { id: string; name: string; color: string | null };
export type Participant = { id: string; name: string; role: string | null; company: string | null; segment: string | null; toolsUsed: string[] };
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
  const themesOfHighlight = new Map<string, Theme[]>();
  for (const t of d.themes) for (const hid of t.highlightIds) themesOfHighlight.set(hid, [...(themesOfHighlight.get(hid) ?? []), t]);
  return { data: d, projects, sources, segments, tags, groups, participants, segmentsBySource, themesOfHighlight };
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
