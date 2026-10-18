import { fmtDate, type Index } from "../data";
import { Link, PageHeader, Table } from "../ui";

export function ProjectsPage({ ix }: { ix: Index }) {
  const rows = [...ix.data.projects].sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
  return (
    <>
      <PageHeader title="Projects" description="Studies, their sources and participants. Read-only demo." />
      <div className="p-6">
        <Table head={["Project", "Product area", "Dates", "Owner", "Sources", "Highlights", "Access"]}>
          {rows.map((p) => {
            const sources = ix.sourcesByProject.get(p.id) ?? [];
            const highlights = sources.reduce((n, s) => n + (ix.highlightsBySource.get(s.id)?.length ?? 0), 0);
            return (
              <tr key={p.id}>
                <td className="px-3 py-2 font-medium"><Link to={`/projects/${p.id}`} className="hover:underline">{p.name}</Link></td>
                <td className="px-3 py-2">{p.productArea ?? <span className="text-muted-foreground">—</span>}</td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{fmtDate(p.startDate)}{p.endDate ? ` – ${fmtDate(p.endDate)}` : ""}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.ownerName ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{sources.length}</td>
                <td className="px-3 py-2 text-right tabular-nums">{highlights}</td>
                <td className="px-3 py-2"><span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs">Open</span></td>
              </tr>
            );
          })}
        </Table>
      </div>
    </>
  );
}
