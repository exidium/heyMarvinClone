import { useMemo, useState } from "react";
import { formatClock } from "@lib/transcript/time";
import { fmtDate, matchesQuery, tagColorOf, type Index } from "../data";
import { navigate } from "../router";
import { Link, PageHeader, TagChip, cx } from "../ui";

type F = { q: string; scope: "highlights" | "transcript"; project: string; area: string; tag: string; role: string; company: string; segment: string };
const EMPTY: F = { q: "", scope: "highlights", project: "", area: "", tag: "", role: "", company: "", segment: "" };

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[] | { v: string; l: string }[]; onChange: (v: string) => void }) {
  const opts = options.map((o) => (typeof o === "string" ? { v: o, l: o } : o));
  return (
    <label className="flex items-center gap-1 text-xs text-muted-foreground">{label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"><option value="">Any</option>{opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
    </label>
  );
}

export function SearchPage({ ix, params }: { ix: Index; params: URLSearchParams }) {
  const f: F = { ...EMPTY, ...Object.fromEntries([...params.entries()].filter(([k]) => k in EMPTY)) } as F;
  const [q, setQ] = useState(f.q);
  const set = (patch: Partial<F>) => navigate("/search", Object.fromEntries(Object.entries({ ...f, ...patch }).map(([k, v]) => [k, v === EMPTY[k as keyof F] ? null : v])));
  const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort();
  const facets = useMemo(() => ({
    areas: uniq(ix.data.projects.map((p) => p.productArea)), roles: uniq(ix.data.participants.map((p) => p.role)), companies: uniq(ix.data.participants.map((p) => p.company)), segments: uniq(ix.data.participants.map((p) => p.segment)),
  }), [ix]);
  const sourceOk = (sid: string) => {
    const s = ix.sources.get(sid)!; const p = ix.projects.get(s.projectId)!;
    if (f.project && p.id !== f.project) return false;
    if (f.area && p.productArea !== f.area) return false;
    const pas = s.participants.map((sp) => ix.participants.get(sp.participantId)).filter(Boolean);
    if (f.role && !pas.some((pa) => pa!.role === f.role)) return false;
    if (f.company && !pas.some((pa) => pa!.company === f.company)) return false;
    if (f.segment && !pas.some((pa) => pa!.segment === f.segment)) return false;
    return true;
  };
  const active = !!(f.q || f.project || f.area || f.tag || f.role || f.company || f.segment);
  const hits = useMemo(() => {
    if (!active) return [];
    if (f.scope === "transcript") return ix.data.segments.filter((g) => sourceOk(g.sourceId) && (!f.q || matchesQuery(g.text, f.q)) && (!f.tag || (ix.highlightsBySource.get(g.sourceId) ?? []).some((h) => h.tags.some((t) => t.tagId === f.tag) && (ix.segments.get(h.startSegmentId)?.order ?? 0) <= g.order && g.order <= (ix.segments.get(h.endSegmentId)?.order ?? 0)))).slice(0, 200);
    return ix.data.highlights.filter((h) => sourceOk(h.sourceId) && (!f.q || matchesQuery(h.text, f.q)) && (!f.tag || h.tags.some((t) => t.tagId === f.tag))).slice(0, 200);
  }, [ix, f, active]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PageHeader title="Search" description="Keyword search across highlights and transcript lines, with filters. Saved views live in the full app.">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); set({ q }); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='Search… quotes for a phrase, -word to exclude' aria-label="Keyword" className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
          <button type="submit" className="h-8 rounded-md bg-primary px-3 text-sm text-primary-foreground">Search</button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border p-0.5 text-xs">{(["highlights", "transcript"] as const).map((s) => <button key={s} type="button" className={cx("rounded px-2 py-1", f.scope === s ? "bg-accent font-medium" : "text-muted-foreground")} onClick={() => set({ scope: s })}>{s === "highlights" ? "Highlights" : "Transcript lines"}</button>)}</div>
          <Select label="Project" value={f.project} options={ix.data.projects.map((p) => ({ v: p.id, l: p.name }))} onChange={(v) => set({ project: v })} />
          <Select label="Area" value={f.area} options={facets.areas} onChange={(v) => set({ area: v })} />
          <Select label="Tag" value={f.tag} options={[...ix.data.tags].sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ v: t.id, l: t.name }))} onChange={(v) => set({ tag: v })} />
          <Select label="Role" value={f.role} options={facets.roles} onChange={(v) => set({ role: v })} />
          <Select label="Company" value={f.company} options={facets.companies} onChange={(v) => set({ company: v })} />
          <Select label="Segment" value={f.segment} options={facets.segments} onChange={(v) => set({ segment: v })} />
          {active ? <button type="button" className="text-xs text-muted-foreground underline" onClick={() => { setQ(""); navigate("/search"); }}>Clear</button> : null}
        </div>
      </PageHeader>
      <div className="flex flex-col gap-3 p-6">
        {!active ? <p className="text-sm text-muted-foreground">Type a keyword or pick a filter.</p> : !hits.length ? <p className="text-sm text-muted-foreground">No results.</p> : <p className="text-sm text-muted-foreground">{hits.length}{hits.length === 200 ? "+" : ""} {f.scope === "highlights" ? "highlights" : "lines"}</p>}
        <ol className="flex flex-col gap-3">
          {hits.map((x) => {
            const s = ix.sources.get(x.sourceId)!; const p = ix.projects.get(s.projectId)!;
            if ("tags" in x) {
              const seg = ix.segments.get(x.startSegmentId);
              return (
                <li key={x.id} className="rounded-lg border p-3 text-sm">
                  <Link to={`/projects/${p.id}/sources/${s.id}`} params={{ highlight: x.id }} className="block"><blockquote className="whitespace-pre-line leading-relaxed">{x.text}</blockquote></Link>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {x.tags.map((t) => { const tag = ix.tags.get(t.tagId); return tag ? <TagChip key={t.tagId} name={tag.name} color={tagColorOf(ix, t.tagId)} /> : null; })}
                    <Link to={`/projects/${p.id}`} className="hover:underline">{p.name}</Link><span>{s.title}{seg?.startMs != null ? ` · ${formatClock(seg.startMs)}` : ""}</span>{s.date ? <span>{fmtDate(s.date)}</span> : null}
                  </div>
                </li>
              );
            }
            return (
              <li key={x.id} className="rounded-lg border p-3 text-sm">
                <Link to={`/projects/${p.id}/sources/${s.id}`} params={{ segment: x.id }} className="block"><span className="mr-2 text-xs font-medium">{x.speaker ?? ""}</span><span className="mr-2 text-xs tabular-nums text-muted-foreground">{x.startMs != null ? formatClock(x.startMs) : ""}</span><span className="leading-relaxed">{x.text}</span></Link>
                <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground"><Link to={`/projects/${p.id}`} className="hover:underline">{p.name}</Link><span>{s.title}</span>{s.date ? <span>{fmtDate(s.date)}</span> : null}</div>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
