import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { ParticipantDialog } from "@/components/participants/ParticipantDialog";
import { requireUser } from "@/lib/auth";
import { listParticipants, participantFacets } from "@/server/queries/participants";

export const metadata = { title: "Participants" };

export default async function ParticipantsPage({ searchParams }: PageProps<"/participants">) {
  const { q } = await searchParams;
  await requireUser();
  const query = typeof q === "string" ? q : "";
  const [rows, facets] = await Promise.all([listParticipants(query), participantFacets()]);
  const newButton = <ParticipantDialog facets={facets} trigger={<Button size="sm"><Plus className="size-4" /> New participant</Button>} />;

  return (
    <>
      <PageHeader title="Participants" description="People you spoke to, reusable across projects." actions={newButton}>
        <form className="flex gap-2" action="/participants">
          <Input name="q" defaultValue={query} placeholder="Search name, company, role, segment…" className="max-w-sm" aria-label="Search participants" />
          <Button type="submit" variant="outline" size="sm">Search</Button>
        </form>
      </PageHeader>
      <div className="p-6">
        {rows.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Tools</TableHead>
                <TableHead className="text-right">Sources</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium"><Link href={`/participants/${p.id}`} className="hover:underline">{p.name}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{p.role ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.company ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.segment ?? "—"}</TableCell>
                  <TableCell className="flex flex-wrap gap-1">{p.toolsUsed.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</TableCell>
                  <TableCell className="text-right tabular-nums">{p._count.sources}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <EmptyState title={query ? "No participants match" : "No participants yet"} action={query ? undefined : newButton} />}
      </div>
    </>
  );
}
