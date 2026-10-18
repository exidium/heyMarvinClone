import { useState } from "react";
import { fmtDate, type Index } from "../data";
import { Link, PageHeader, Table } from "../ui";

export function ParticipantsPage({ ix }: { ix: Index }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const rows = ix.data.participants.filter((p) => !needle || [p.name, p.company, p.role, p.segment].some((v) => v?.toLowerCase().includes(needle))).sort((a, b) => a.name.localeCompare(b.name));
  const sourceCount = (id: string) => ix.data.sources.filter((s) => s.participants.some((sp) => sp.participantId === id)).length;
  return (
    <>
      <PageHeader title="Participants" description="People you spoke to, reusable across projects.">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company, role, segment…" aria-label="Search participants" className="h-8 max-w-sm rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
      </PageHeader>
      <div className="p-6">
        <Table head={["Name", "Role", "Company", "Segment", "Tools", "Sources"]}>
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="px-3 py-2 font-medium"><Link to={`/participants/${p.id}`} className="hover:underline">{p.name}</Link></td>
              <td className="px-3 py-2 text-muted-foreground">{p.role ?? "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{p.company ?? "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{p.segment ?? "—"}</td>
              <td className="px-3 py-2"><span className="flex flex-wrap gap-1">{p.toolsUsed.map((t) => <span key={t} className="rounded-md border px-1.5 py-0.5 text-xs">{t}</span>)}</span></td>
              <td className="px-3 py-2 text-right tabular-nums">{sourceCount(p.id)}</td>
            </tr>
          ))}
        </Table>
      </div>
    </>
  );
}

export function ParticipantPage({ ix, id }: { ix: Index; id: string }) {
  const p = ix.participants.get(id);
  if (!p) return <p className="p-6 text-sm text-muted-foreground">Participant not found.</p>;
  const sources = ix.data.sources.filter((s) => s.participants.some((sp) => sp.participantId === id));
  return (
    <>
      <PageHeader title={p.name} description="Participant" />
      <div className="grid gap-8 p-6 lg:grid-cols-[320px_1fr]">
        <dl className="flex flex-col gap-3 text-sm">
          {([["Role", p.role], ["Company", p.company], ["Segment", p.segment]] as const).map(([k, v]) => <div key={k}><dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt><dd>{v ?? <span className="text-muted-foreground">—</span>}</dd></div>)}
          <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Tools used</dt><dd className="flex flex-wrap gap-1">{p.toolsUsed.length ? p.toolsUsed.map((t) => <span key={t} className="rounded-md border px-1.5 py-0.5 text-xs">{t}</span>) : "—"}</dd></div>
          {p.notes ? <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Notes</dt><dd className="whitespace-pre-line">{p.notes}</dd></div> : null}
        </dl>
        <section>
          <h2 className="mb-2 text-sm font-medium">Sources</h2>
          <Table head={["Source", "Project", "Date", "Highlights"]}>
            {sources.map((s) => (
              <tr key={s.id}>
                <td className="px-3 py-2 font-medium"><Link to={`/projects/${s.projectId}/sources/${s.id}`} className="hover:underline">{s.title}</Link></td>
                <td className="px-3 py-2"><Link to={`/projects/${s.projectId}`} className="text-muted-foreground hover:underline">{ix.projects.get(s.projectId)?.name}</Link></td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{fmtDate(s.date)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{ix.highlightsBySource.get(s.id)?.length ?? 0}</td>
              </tr>
            ))}
          </Table>
        </section>
      </div>
    </>
  );
}
