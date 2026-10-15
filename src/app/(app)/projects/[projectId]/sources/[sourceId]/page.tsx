import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/badge";
import { SourceActions } from "@/components/sources/SourceActions";
import { UploadPanel } from "@/components/sources/UploadPanel";
import { MediaPlayer } from "@/components/transcript/MediaPlayer";
import { TranscriptView } from "@/components/transcript/TranscriptView";
import { requireUser } from "@/lib/auth";
import { roleAtLeast } from "@/lib/authz";
import { formatDate, plural } from "@/lib/format";
import { getSourceForUser } from "@/server/queries/sources";

export default async function SourcePage({ params }: PageProps<"/projects/[projectId]/sources/[sourceId]">) {
  const { projectId, sourceId } = await params;
  const user = await requireUser();
  const data = await getSourceForUser(user, sourceId);
  if (!data || data.source.projectId !== projectId) notFound();
  const { source, role } = data;
  const canEdit = roleAtLeast(role, "EDITOR");
  const participants = source.participants.map((sp) => sp.participant);
  const hasRecording = !!source.recordingPath;

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
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px]">
        <section className="min-w-0">
          {source.segments.length ? (
            <TranscriptView segments={source.segments} hasRecording={hasRecording} />
          ) : (
            <p className="text-sm text-muted-foreground">{canEdit ? "Upload a transcript to get started." : "No transcript yet."}</p>
          )}
        </section>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          {hasRecording ? <MediaPlayer sourceId={source.id} mime={source.recordingMime} durationMs={source.durationMs} /> : null}
          <div>
            <h2 className="mb-2 text-sm font-medium">Files</h2>
            <UploadPanel
              sourceId={source.id}
              transcriptName={source.transcriptName}
              recordingName={source.recordingName}
              highlightCount={source._count.highlights}
              canEdit={canEdit}
              status={source.status}
              errorMessage={source.errorMessage}
            />
          </div>
        </aside>
      </div>
    </>
  );
}
