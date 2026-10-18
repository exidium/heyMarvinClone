import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { findPath, formatKey, parseKey, PIVOT_LABEL, PIVOTS, type Pivot, type TreeNode } from "@lib/explore";
import { formatClock } from "@lib/transcript/time";
import { fmtDate, matchesQuery, tagColorOf, type Highlight, type Index } from "../data";
import { navigate } from "../router";
import { Link, TagChip, cx } from "../ui";

const NONE = "—";

// ---------- trees and filters over the in-memory data ----------
function visible(ix: Index, q: string): Highlight[] {
  return q.trim() ? ix.data.highlights.filter((h) => matchesQuery(h.text, q)) : ix.data.highlights;
}

type Row = Highlight & { seg: { speaker: string | null; startMs: number | null; order: number }; source: Index["sources"] extends Map<string, infer S> ? S : never; project: { id: string; name: string; productArea: string | null } };
function enrich(ix: Index, hs: Highlight[]): Row[] {
  return hs.map((h) => {
    const seg = ix.segments.get(h.startSegmentId)!;
    const source = ix.sources.get(h.sourceId)!;
    const project = ix.projects.get(source.projectId)!;
    return { ...h, seg: { speaker: seg.speaker, startMs: seg.startMs, order: seg.order }, source, project };
  });
}

function group<T>(xs: T[], by: (x: T) => string | null) {
  const m = new Map<string | null, T[]>();
  for (const x of xs) { const k = by(x); m.set(k, [...(m.get(k) ?? []), x]); }
  return [...m.entries()];
}
const byLabel = (a: TreeNode, b: TreeNode) => a.label.localeCompare(b.label);

function buildTree(ix: Index, pivot: Pivot, rows: Row[]): TreeNode[] {
  if (pivot === "projects") {
    return group(rows, (r) => r.project.productArea).map(([area, ar]) => ({
      key: formatKey({ kind: "area", id: area ?? NONE }), label: area ?? "No product area", count: ar.length,
      children: group(ar, (r) => r.project.id).map(([pid, pr]) => ({
        key: formatKey({ kind: "project", id: pid! }), label: pr[0].project.name, count: pr.length,
        children: group(pr, (r) => r.source.id).map(([sid, sr]) => ({
          key: formatKey({ kind: "source", id: sid! }), label: sr[0].source.title, count: sr.length,
          children: group(sr, (r) => r.seg.speaker).map(([sp, xs]) => ({ key: formatKey({ kind: "speaker", id: sid!, extra: sp ?? NONE }), label: sp ?? "No speaker", count: xs.length })).sort(byLabel),
        })).sort(byLabel),
      })).sort(byLabel),
    })).sort(byLabel);
  }
  if (pivot === "tags") {
    const pairs = rows.flatMap((r) => r.tags.map((t) => ({ r, tag: ix.tags.get(t.tagId)! })).filter((x) => x.tag));
    const groups = group(pairs, (x) => x.tag.groupId).map(([gid, xs]) => ({
      key: formatKey({ kind: "group", id: gid ?? NONE }), label: gid ? ix.groups.get(gid)?.name ?? "Ungrouped" : "Ungrouped", count: new Set(xs.map((x) => x.r.id)).size,
      children: group(xs, (x) => x.tag.id).map(([tid, ys]) => ({ key: formatKey({ kind: "tag", id: tid! }), label: ys[0].tag.name, count: ys.length })).sort(byLabel),
    })).sort(byLabel);
    const untagged = rows.filter((r) => !r.tags.length).length;
    return untagged ? [...groups, { key: "untagged", label: "Untagged", count: untagged }] : groups;
  }
  if (pivot === "people") {
    const pairs = rows.flatMap((r) => r.source.participants.map((p) => ({ r, pa: ix.participants.get(p.participantId)! })).filter((x) => x.pa));
    const segs = group(pairs, (x) => x.pa.segment).map(([seg, xs]) => ({
      key: formatKey({ kind: "segment", id: seg ?? NONE }), label: seg ?? "No segment", count: new Set(xs.map((x) => x.r.id)).size,
      children: group(xs, (x) => x.pa.company).map(([co, ys]) => ({
        key: formatKey({ kind: "company", id: co ?? NONE }), label: co ?? "No company", count: new Set(ys.map((x) => x.r.id)).size,
        children: group(ys, (x) => x.pa.id).map(([pid, zs]) => ({ key: formatKey({ kind: "participant", id: pid! }), label: zs[0].pa.name, count: zs.length })).sort(byLabel),
      })).sort(byLabel),
    })).sort(byLabel);
    const none = rows.filter((r) => !r.source.participants.length).length;
    return none ? [...segs, { key: "noparticipant", label: "No participant linked", count: none }] : segs;
  }
  const ids = new Set(rows.map((r) => r.id));
  const build = (parentId: string | null): TreeNode[] =>
    ix.data.themes.filter((t) => t.parentId === parentId).map((t) => {
      const children = build(t.id);
      return { key: formatKey({ kind: "theme", id: t.id }), label: t.title, count: t.highlightIds.filter((id) => ids.has(id)).length, children: children.length ? children : undefined };
    });
  const unthemed = rows.filter((r) => !ix.themesOfHighlight.has(r.id)).length;
  return [...build(null), { key: "unthemed", label: "Not in any theme", count: unthemed }];
}

function filterRows(ix: Index, rows: Row[], rawKey: string): Row[] {
  const k = parseKey(rawKey);
  const v = (x?: string) => (x === NONE ? null : x);
  const hasAttr = (r: Row, f: (p: NonNullable<ReturnType<Index["participants"]["get"]>>) => boolean) => r.source.participants.some((p) => { const pa = ix.participants.get(p.participantId); return pa ? f(pa) : false; });
  switch (k.kind) {
    case "root": return rows;
    case "area": return rows.filter((r) => r.project.productArea === v(k.id));
    case "project": return rows.filter((r) => r.project.id === k.id);
    case "source": return rows.filter((r) => r.source.id === k.id);
    case "speaker": return rows.filter((r) => r.source.id === k.id && r.seg.speaker === v(k.extra));
    case "group": return rows.filter((r) => r.tags.some((t) => (ix.tags.get(t.tagId)?.groupId ?? null) === v(k.id)));
    case "tag": return rows.filter((r) => r.tags.some((t) => t.tagId === k.id));
    case "untagged": return rows.filter((r) => !r.tags.length);
    case "segment": return rows.filter((r) => hasAttr(r, (p) => p.segment === v(k.id)));
    case "company": return rows.filter((r) => hasAttr(r, (p) => p.company === v(k.id)));
    case "participant": return rows.filter((r) => r.source.participants.some((p) => p.participantId === k.id));
    case "noparticipant": return rows.filter((r) => !r.source.participants.length);
    case "theme": { const t = ix.data.themes.find((x) => x.id === k.id); const set = new Set(t?.highlightIds ?? []); return rows.filter((r) => set.has(r.id)); }
    case "unthemed": return rows.filter((r) => !ix.themesOfHighlight.has(r.id));
  }
}

function findNode(nodes: TreeNode[], key: string): TreeNode | null {
  for (const n of nodes) { if (n.key === key) return n; const f = n.children ? findNode(n.children, key) : null; if (f) return f; }
  return null;
}

// ---------- page ----------
type State = { pivot: Pivot; node: string; q: string; h: string | null };

export function ExplorePage({ ix, params }: { ix: Index; params: URLSearchParams }) {
  const state: State = {
    pivot: (PIVOTS as readonly string[]).includes(params.get("pivot") ?? "") ? (params.get("pivot") as Pivot) : "projects",
    node: params.get("node") ?? "", q: params.get("q") ?? "", h: params.get("h"),
  };
  const set = (patch: Partial<State>, replace = false) => { const n = { ...state, ...patch }; navigate("/explore", { pivot: n.pivot === "projects" ? null : n.pivot, node: n.node || null, q: n.q || null, h: n.h }, replace); };
  const [qDraft, setQDraft] = useState(state.q);

  const all = useMemo(() => enrich(ix, visible(ix, state.q)), [ix, state.q]);
  const tree = useMemo(() => buildTree(ix, state.pivot, all), [ix, state.pivot, all]);
  const rows = useMemo(() => {
    const r = filterRows(ix, all, state.node);
    const k = parseKey(state.node);
    if (k.kind === "theme") { const order = new Map((ix.data.themes.find((t) => t.id === k.id)?.highlightIds ?? []).map((id, i) => [id, i])); return [...r].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)); }
    return [...r].sort((a, b) => (b.source.date ?? "").localeCompare(a.source.date ?? "") || a.source.title.localeCompare(b.source.title) || a.seg.order - b.seg.order || a.startOffset - b.startOffset);
  }, [ix, all, state.node]);
  const selected = rows.find((r) => r.id === state.h) ?? rows[0] ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (!["j", "k", "ArrowDown", "ArrowUp"].includes(e.key) || !rows.length) return;
      e.preventDefault();
      const i = rows.findIndex((r) => r.id === selected?.id);
      const next = e.key === "j" || e.key === "ArrowDown" ? Math.min(rows.length - 1, i + 1) : Math.max(0, i - 1);
      set({ h: rows[next].id }, true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const theme = parseKey(state.node).kind === "theme" ? ix.data.themes.find((t) => t.id === parseKey(state.node).id) : null;
  const base = state.node === "" ? "All highlights" : findNode(tree, state.node)?.label ?? "Highlights";
  const title = state.q ? `${base} · matching “${state.q}”` : base;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-13 shrink-0 items-center gap-4 border-b px-4">
        <h1 className="shrink-0 text-base font-semibold tracking-tight">Explore</h1>
        <form className="relative mx-auto w-full max-w-xl" role="search" onSubmit={(e) => { e.preventDefault(); set({ q: qDraft, h: null }); }}>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={qDraft} onChange={(e) => setQDraft(e.target.value)} placeholder='Search highlights… quotes for a phrase, -word to exclude' aria-label="Search highlights"
            className="h-8 w-full rounded-lg border border-input bg-transparent pr-8 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
          {state.q ? <button type="button" aria-label="Clear search" className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => { setQDraft(""); set({ q: "", h: null }); }}><X className="size-4" /></button> : null}
        </form>
        <p className="hidden shrink-0 text-xs text-muted-foreground lg:block">Synthetic data · read-only</p>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_minmax(320px,38%)] gap-4 p-4">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border p-2">
          <div className="mb-2 flex rounded-md border p-0.5 text-xs">
            {PIVOTS.map((p) => (
              <button key={p} type="button" className={cx("flex-1 rounded px-2 py-1", state.pivot === p ? "bg-accent font-medium" : "text-muted-foreground hover:text-foreground")} onClick={() => set({ pivot: p, node: "", h: null })}>{PIVOT_LABEL[p]}</button>
            ))}
          </div>
          <Tree nodes={tree} selected={state.node} total={all.length} onSelect={(key) => set({ node: key, h: null })} />
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden">
          {theme ? (
            <div className="mb-3 rounded-lg border bg-muted/30 p-3">
              <h2 className="text-base font-semibold leading-snug">{theme.title}</h2>
              {theme.description ? <p className="mt-1 text-sm text-muted-foreground">{theme.description}</p> : null}
              <div className="mt-2 flex gap-1 text-xs">{theme.confidence ? <span className="rounded-md border px-1.5 py-0.5">{theme.confidence[0] + theme.confidence.slice(1).toLowerCase()} confidence</span> : null}<span className="text-muted-foreground">{theme.highlightIds.length} highlights</span></div>
            </div>
          ) : null}
          <div className="mb-2 flex items-baseline justify-between"><h2 className="truncate text-sm font-medium">{title}</h2><span className="text-xs text-muted-foreground">{rows.length}</span></div>
          {rows.length ? (
            <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {rows.map((h) => {
                const sel = h.id === selected?.id;
                return (
                  <li key={h.id} data-id={h.id} onClick={() => set({ h: h.id }, true)} className={cx("cursor-pointer rounded-lg border p-3 text-sm transition-colors", sel ? "border-foreground/40 bg-accent" : "hover:bg-muted/50")}>
                    <blockquote className="line-clamp-4 border-l-2 pl-2 leading-snug" style={{ borderColor: h.tags[0] ? tagColorOf(ix, h.tags[0].tagId) : "#9ca3af" }}>{h.text}</blockquote>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {h.tags.map((t) => { const tag = ix.tags.get(t.tagId); return tag ? <TagChip key={t.tagId} name={tag.name} color={tagColorOf(ix, t.tagId)} /> : null; })}
                      <span className="truncate">{h.seg.speaker ?? "Unknown speaker"}</span><span>·</span><span className="truncate">{h.project.name}</span>
                      {h.source.date ? <span>· {fmtDate(h.source.date)}</span> : null}{h.seg.startMs != null ? <span>· {formatClock(h.seg.startMs)}</span> : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : <p className="text-sm text-muted-foreground">Nothing here.</p>}
        </section>

        <aside className="min-h-0 overflow-y-auto rounded-lg border p-4">
          {selected ? <Detail ix={ix} h={selected} /> : <p className="text-sm text-muted-foreground">Select a highlight to read it in context. Use j and k to move.</p>}
        </aside>
      </div>
    </div>
  );
}

function Tree({ nodes, selected, total, onSelect }: { nodes: TreeNode[]; selected: string; total: number; onSelect: (k: string) => void }) {
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const open = useMemo(() => { const o = new Set([...(findPath(nodes, selected) ?? []), ...opened]); for (const c of closed) o.delete(c); return o; }, [nodes, selected, opened, closed]);
  const toggle = (key: string) => {
    if (open.has(key)) { setClosed((p) => new Set([...p, key])); setOpened((p) => { const n = new Set(p); n.delete(key); return n; }); }
    else { setOpened((p) => new Set([...p, key])); setClosed((p) => { const n = new Set(p); n.delete(key); return n; }); }
  };
  const render = (n: TreeNode, depth: number) => {
    const isOpen = open.has(n.key); const sel = n.key === selected;
    return (
      <li key={n.key}>
        <div className={cx("flex items-center gap-1 rounded-md py-1 pr-1 text-sm", sel ? "bg-accent font-medium" : "hover:bg-muted/60")} style={{ paddingLeft: depth * 14 + 4 }}>
          <button type="button" aria-label={isOpen ? "Collapse" : "Expand"} className={cx("size-5 shrink-0 rounded text-muted-foreground hover:bg-muted", !n.children && "invisible")} onClick={() => toggle(n.key)}>{isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</button>
          <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => onSelect(n.key)}><span className="truncate">{n.label}</span><span className="ml-auto shrink-0 tabular-nums text-xs text-muted-foreground">{n.count}</span></button>
        </div>
        {n.children && isOpen ? <ul>{n.children.map((c) => render(c, depth + 1))}</ul> : null}
      </li>
    );
  };
  return (
    <ul className="min-h-0 flex-1 overflow-y-auto pr-1">
      <li><button type="button" className={cx("flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-sm", selected === "" ? "bg-accent font-medium" : "hover:bg-muted/60")} onClick={() => onSelect("")}><span className="pl-5">All highlights</span><span className="ml-auto tabular-nums text-xs text-muted-foreground">{total}</span></button></li>
      {nodes.map((n) => render(n, 0))}
    </ul>
  );
}

function Detail({ ix, h }: { ix: Index; h: Row }) {
  const segs = ix.segmentsBySource.get(h.sourceId) ?? [];
  const endOrder = ix.segments.get(h.endSegmentId)?.order ?? h.seg.order;
  const context = segs.filter((s) => s.order >= h.seg.order - 2 && s.order <= endOrder + 2);
  const themes = ix.themesOfHighlight.get(h.id) ?? [];
  const people = h.source.participants.map((p) => ix.participants.get(p.participantId)).filter(Boolean) as NonNullable<ReturnType<Index["participants"]["get"]>>[];
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div>
        <div className="flex flex-wrap gap-1">{h.tags.map((t) => { const tag = ix.tags.get(t.tagId); return tag ? <TagChip key={t.tagId} name={tag.name} color={tagColorOf(ix, t.tagId)} /> : null; })}{!h.tags.length ? <span className="text-xs text-muted-foreground">No tags</span> : null}</div>
        <blockquote className="mt-2 whitespace-pre-line border-l-2 pl-3 text-base leading-relaxed">{h.text}</blockquote>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <dt>Who</dt><dd>{h.seg.speaker ?? "—"}{people.length ? ` · ${people.map((p) => [p.name, p.role, p.company].filter(Boolean).join(", ")).join("; ")}` : ""}</dd>
        <dt>Where</dt><dd>{h.project.name}{h.project.productArea ? ` · ${h.project.productArea}` : ""}</dd>
        <dt>Source</dt><dd>{h.source.title}{h.source.date ? ` · ${fmtDate(h.source.date)}` : ""}{h.seg.startMs != null ? ` · ${formatClock(h.seg.startMs)}` : ""}</dd>
      </dl>
      {themes.length ? <div><h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">In themes</h3><ul className="flex flex-wrap gap-1">{themes.map((t) => <li key={t.id} className="rounded-md bg-secondary px-1.5 py-0.5 text-xs">{t.title}</li>)}</ul></div> : null}
      <div>
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">In context</h3>
        <ol className="flex flex-col gap-2 rounded-md border p-3">
          {context.map((s) => {
            const inside = s.order >= h.seg.order && s.order <= endOrder;
            const from = s.order === h.seg.order ? h.startOffset : 0;
            const to = s.order === endOrder ? h.endOffset : s.text.length;
            return (
              <li key={s.id} className={inside ? "" : "opacity-60"}>
                <div className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{s.speaker ?? ""}</span>{s.startMs != null ? <span className="ml-1 tabular-nums">{formatClock(s.startMs)}</span> : null}</div>
                <p className="whitespace-pre-wrap leading-snug">{inside ? <>{s.text.slice(0, from)}<mark className="rounded-sm bg-yellow-200/70 px-0.5 dark:bg-yellow-500/30">{s.text.slice(from, to)}</mark>{s.text.slice(to)}</> : s.text}</p>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link to={`/projects/${h.project.id}/sources/${h.source.id}`} params={{ highlight: h.id }} className="rounded-md border px-2 py-1 hover:bg-muted">Open transcript</Link>
        <Link to={`/projects/${h.project.id}`} className="rounded-md border px-2 py-1 hover:bg-muted">Open project</Link>
      </div>
      <p className="text-xs text-muted-foreground">Recordings are not part of this demo; the full app plays the moment here.</p>
    </div>
  );
}
