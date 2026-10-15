import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/badge";
import { SourceActions } from "@/components/sources/SourceActions";
import { requireUser } from "@/lib/auth";
import { roleAtLeast } from "@/lib/authz";
import { formatDate, plural } from "@/lib/format";
import { formatClock } from "@/lib/transcript/time";
import { getSourceForUser } from "@/server/queries/sources";

export default async function SourcePage({ params }: PageProps<"/projects/[projectId]/sources/[sourceId]">) {
  const { projectId, sourceId } = await params;
  const user = await requireUser();
  const data = await getSourceForUser(user, sourceId);
  if (!data || data.source.projectId !== projectId) notFound();
  const { source, role } = data;
  const canEdit = roleAtLeast(role, "EDITOR");
  const participants = source.participants.map((sp) => sp.participant);

  return (
    <>
      <PageHeader
        title={source.title}
        description={
          <span className="flex flex-wrap gap-x-3">
            <Link href={`/projects/${projectId}`} className="hover:underline">{source.project.name}</Link>
            {source.date ? <span>{formatDate(source.date)}</span> : null}
            <span>{participants.map((p) => p.name).join(", ") || "No participants"}</span>
            <span>{plural(source.segments.length, "segment")} · {plural(source._count.highlights, "highlight")}</span>
            <Badge variant="outline">{source.kind.toLowerCase()}</Badge>
          </span>
        }
        actions={canEdit ? <SourceActions projectId={projectId} source={{ id: source.id, title: source.title, date: source.date, participants }} /> : null}
      />
      <div className="p-6">
        {/* Read-only rendering until the transcript editor milestone. */}
        {source.segments.length ? (
          <ol className="mx-auto flex max-w-3xl flex-col gap-3 text-sm">
            {source.segments.map((s) => (
              <li key={s.id} className="grid grid-cols-[140px_1fr] gap-3">
                <div className="truncate text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{s.speaker ?? ""}</span>
                  {s.startMs != null ? <span className="ml-1 tabular-nums">{formatClock(s.startMs)}</span> : null}
                </div>
                <p className="whitespace-pre-wrap">{s.text}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No transcript yet. Upload arrives in the next milestone.</p>
        )}
      </div>
    </>
  );
}
