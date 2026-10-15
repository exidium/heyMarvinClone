import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccessBadge } from "@/components/shared/AccessBadge";
import { formatDate } from "@/lib/format";

export type ProjectRow = {
  id: string; name: string; productArea: string | null; startDate: Date | null; endDate: Date | null;
  access: "OPEN" | "RESTRICTED"; archivedAt: Date | null;
  owner: { id: string; name: string | null; email: string };
  _count: { sources: number; members: number };
  highlights: number;
};

export function ProjectsTable({ rows }: { rows: ProjectRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead>Product area</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead className="text-right">Sources</TableHead>
          <TableHead className="text-right">Highlights</TableHead>
          <TableHead>Access</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-medium">
              <Link href={`/projects/${p.id}`} className="hover:underline">{p.name}</Link>
              {p.archivedAt ? <span className="ml-2 text-xs text-muted-foreground">archived</span> : null}
            </TableCell>
            <TableCell>{p.productArea ?? <span className="text-muted-foreground">—</span>}</TableCell>
            <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(p.startDate)}{p.endDate ? ` – ${formatDate(p.endDate)}` : ""}</TableCell>
            <TableCell className="text-muted-foreground">{p.owner.name ?? p.owner.email}</TableCell>
            <TableCell className="text-right tabular-nums">{p._count.sources}</TableCell>
            <TableCell className="text-right tabular-nums">{p.highlights}</TableCell>
            <TableCell><AccessBadge access={p.access} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
