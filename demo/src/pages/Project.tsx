import { fmtDate, type Index } from "../data";
import { Link, PageHeader, Table } from "../ui";

export function ProjectPage({ ix, id }: { ix: Index; id: string }) {
  const p = ix.projects.get(id);
  if (!p) return <p className="p-6 text-sm text-muted-foreground">Project not found.</p>;
  const sources = [...(ix.sourcesByProject.get(p.id) ?? [])].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const highlightCount = sources.reduce((n, s) => n + (ix.highlightsBySource.get(s.id)?.length ?? 0), 0);
  const participants = new Map<string, { name: string; role: string | null; company: string | null; n: number }>();
  for (const s of sources) for (const sp of s.participants) {
    const pa = ix.participants.get(sp.participantId); if (!pa) continue;
    const cur = participants.get(pa.id) ?? { name: pa.name, role: pa.role, company: pa.company, n: 0 }; cur.n++; participants.set(pa.id, cur);
  }
  return (
    <>
      <PageHeader title={p.name} description={<span className="flex flex-wrap gap-x-3">{p.productArea ? <span>{p.productArea}</span> : null}{p.startDate ? <span>{fmtDate(p.startDate)}{p.endDate ? ` – ${fmtDate(p.endDate)}` : ""}</span> : null}<span>Owner {p.ownerName ?? "—"}</span><span>{sources.length} sources · {highlightCount} highlights</span></span>} />
      <div className="grid gap-8 p-6 lg:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-6">
          {p.goal ? <div><h2 className="mb-1 text-sm font-medium">Goal</h2><p className="whitespace-pre-line text-sm text-muted-foreground">{p.goal.slice(0, 1200)}</p></div> : null}
          <div>
            <h2 className="mb-2 text-sm font-medium">Sources</h2>
            <Table head={["Title", "Date", "Participants", "Segments", "Highlights"]}>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 font-medium"><Link to={`/projects/${p.id}/sources/${s.id}`} className="hover:underline">{s.title}</Link>{s.kind === "NOTE" ? <span className="ml-2 text-xs text-muted-foreground">note</span> : null}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{fmtDate(s.date)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{s.participants.map((sp) => ix.participants.get(sp.participantId)?.name).filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{ix.segmentsBySource.get(s.id)?.length ?? 0}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{ix.highlightsBySource.get(s.id)?.length ?? 0}</td>
                </tr>
              ))}
            </Table>
          </div>
        </section>
        <aside>
          <h2 className="mb-2 text-sm font-medium">Participants</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {[...participants.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([pid, pa]) => (
              <li key={pid} className="flex items-baseline justify-between gap-2"><Link to={`/participants/${pid}`} className="truncate hover:underline">{pa.name}</Link><span className="truncate text-xs text-muted-foreground">{[pa.role, pa.company].filter(Boolean).join(" · ")}</span></li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
