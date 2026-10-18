import { useEffect, useMemo, useState } from "react";
import { formatClock } from "@lib/transcript/time";
import { fmtDate, tagColorOf, type Highlight, type Index, type Segment } from "../data";
import { Link, PageHeader, TagChip, cx } from "../ui";

/** Splits a segment's text into runs by the highlights covering it (same rule as the editor's doc builder). */
function runs(seg: Segment, hs: Highlight[], ix: Index) {
  const intervals = hs.flatMap((h) => {
    const so = ix.segments.get(h.startSegmentId)?.order ?? -1; const eo = ix.segments.get(h.endSegmentId)?.order ?? -1;
    if (seg.order < so || seg.order > eo) return [];
    const from = seg.order === so ? Math.min(h.startOffset, seg.text.length) : 0; const to = seg.order === eo ? Math.min(h.endOffset, seg.text.length) : seg.text.length;
    return to > from ? [{ id: h.id, from, to, color: h.tags[0] ? tagColorOf(ix, h.tags[0].tagId) : "#9ca3af" }] : [];
  });
  if (!intervals.length) return [{ text: seg.text, marks: [] as { id: string; color: string }[] }];
  const cuts = [...new Set([0, seg.text.length, ...intervals.flatMap((i) => [i.from, i.to])])].sort((a, b) => a - b);
  const out: { text: string; marks: { id: string; color: string }[] }[] = [];
  for (let k = 0; k < cuts.length - 1; k++) { const a = cuts[k], b = cuts[k + 1]; if (b > a) out.push({ text: seg.text.slice(a, b), marks: intervals.filter((i) => i.from <= a && i.to >= b).map((i) => ({ id: i.id, color: i.color })) }); }
  return out;
}

export function SourcePage({ ix, projectId, sourceId, params }: { ix: Index; projectId: string; sourceId: string; params: URLSearchParams }) {
  const s = ix.sources.get(sourceId);
  const p = ix.projects.get(projectId);
  const segments = ix.segmentsBySource.get(sourceId) ?? [];
  const highlights = useMemo(() => [...(ix.highlightsBySource.get(sourceId) ?? [])].sort((a, b) => (ix.segments.get(a.startSegmentId)?.order ?? 0) - (ix.segments.get(b.startSegmentId)?.order ?? 0) || a.startOffset - b.startOffset), [ix, sourceId]);
  const [selected, setSelected] = useState<string | null>(params.get("highlight"));
  const segParam = params.get("segment");

  useEffect(() => {
    const el = selected ? document.querySelector(`mark[data-hl="${selected}"]`) : segParam ? document.querySelector(`[data-segment="${segParam}"]`) : null;
    el?.scrollIntoView({ block: "center" });
  }, [selected, segParam]);

  if (!s || !p) return <p className="p-6 text-sm text-muted-foreground">Source not found.</p>;
  const participants = s.participants.map((sp) => ix.participants.get(sp.participantId)).filter(Boolean);
  return (
    <>
      <PageHeader title={s.title} description={<span className="flex flex-wrap gap-x-3"><Link to={`/projects/${p.id}`} className="hover:underline">{p.name}</Link>{s.date ? <span>{fmtDate(s.date)}</span> : null}<span>{participants.map((x) => x!.name).join(", ") || "No participants"}</span><span>{segments.length} segments · {highlights.length} highlights</span><span className="rounded-md border px-1.5 text-xs">{s.kind.toLowerCase()}</span></span>} />
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
        <ol className="flex flex-col gap-1 text-sm">
          {segments.map((seg) => (
            <li key={seg.id} data-segment={seg.id} className={cx("grid grid-cols-[150px_1fr] gap-3 rounded-md px-2 py-1.5", segParam === seg.id && "bg-accent")}>
              <div className="truncate text-xs text-muted-foreground"><span className="font-medium text-foreground">{seg.speaker ?? ""}</span>{seg.startMs != null ? <span className="ml-1 tabular-nums">{formatClock(seg.startMs)}</span> : null}</div>
              <p className="whitespace-pre-wrap leading-relaxed">
                {runs(seg, highlights, ix).map((r, i) => r.marks.length
                  ? <mark key={i} data-hl={r.marks[0].id} onClick={() => setSelected(r.marks[0].id)} className={cx("cursor-pointer rounded-sm px-0.5", r.marks.some((m) => m.id === selected) && "outline-2 outline-offset-1")} style={{ background: `color-mix(in oklab, ${r.marks[0].color} ${r.marks.length > 1 ? 45 : 28}%, transparent)`, outlineColor: r.marks[0].color }}>{r.text}</mark>
                  : <span key={i}>{r.text}</span>)}
              </p>
            </li>
          ))}
        </ol>
        <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
          <div className="mb-2 flex items-baseline justify-between"><h2 className="text-sm font-medium">Highlights</h2><span className="text-xs text-muted-foreground">{highlights.length}</span></div>
          <ul className="flex flex-col gap-2">
            {highlights.map((h) => (
              <li key={h.id} onClick={() => setSelected(h.id)} className={cx("cursor-pointer rounded-md border p-2 text-sm", h.id === selected ? "border-foreground/40 bg-accent" : "hover:bg-muted/50")}>
                <blockquote className="line-clamp-4 border-l-2 pl-2 text-[13px] leading-snug" style={{ borderColor: h.tags[0] ? tagColorOf(ix, h.tags[0].tagId) : "#9ca3af" }}>{h.text}</blockquote>
                <div className="mt-1.5 flex flex-wrap gap-1">{h.tags.map((t) => { const tag = ix.tags.get(t.tagId); return tag ? <TagChip key={t.tagId} name={tag.name} color={tagColorOf(ix, t.tagId)} /> : null; })}</div>
              </li>
            ))}
            {!highlights.length ? <li className="text-sm text-muted-foreground">No highlights in this source.</li> : null}
          </ul>
        </aside>
      </div>
    </>
  );
}
