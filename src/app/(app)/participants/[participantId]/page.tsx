import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ParticipantActions } from "@/components/participants/ParticipantActions";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getParticipantForUser, participantFacets } from "@/server/queries/participants";

export default async function ParticipantPage({ params }: PageProps<"/participants/[participantId]">) {
  const { participantId } = await params;
  const user = await requireUser();
  const [data, facets] = await Promise.all([getParticipantForUser(user, participantId), participantFacets()]);
  if (!data) notFound();
  const { participant, sources } = data;
  const attrs: [string, React.ReactNode][] = [
    ["Role", participant.role],
    ["Company", participant.company],
    ["Segment", participant.segment],
    ["Tools used", participant.toolsUsed.length ? <span className="flex flex-wrap gap-1">{participant.toolsUsed.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</span> : null],
  ];

  return (
    <>
      <PageHeader title={participant.name} description="Participant" actions={<ParticipantActions participant={participant} facets={facets} canDelete={user.isAdmin} />} />
      <div className="grid gap-8 p-6 lg:grid-cols-[320px_1fr]">
        <dl className="flex flex-col gap-3 text-sm">
          {attrs.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
              <dd>{v ?? <span className="text-muted-foreground">—</span>}</dd>
            </div>
          ))}
          {participant.notes ? <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Notes</dt><dd className="whitespace-pre-line">{participant.notes}</dd></div> : null}
        </dl>
        <section>
          <h2 className="mb-2 text-sm font-medium">Sources</h2>
          {sources.length ? (
            <Table>
              <TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Project</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Highlights</TableHead></TableRow></TableHeader>
              <TableBody>
                {sources.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium"><Link href={`/projects/${s.projectId}/sources/${s.id}`} className="hover:underline">{s.title}</Link></TableCell>
                    <TableCell><Link href={`/projects/${s.projectId}`} className="text-muted-foreground hover:underline">{s.project.name}</Link></TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(s.date)}</TableCell>
                    <TableCell className="text-right tabular-nums">{s._count.highlights}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p className="text-sm text-muted-foreground">Not linked to any source you can see.</p>}
        </section>
      </div>
    </>
  );
}
