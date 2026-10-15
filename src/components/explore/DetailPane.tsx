"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, FolderPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MediaPlayer } from "@/components/transcript/MediaPlayer";
import { AddToThemePicker } from "@/components/explore/AddToThemePicker";
import { tagColor } from "@/lib/colors";
import { formatDate } from "@/lib/format";
import { formatClock } from "@/lib/transcript/time";
import { usePlayer } from "@/stores/player";
import { getHighlightContext, removeFromTheme } from "@/server/actions/themes";
import type { HighlightContext } from "@/server/queries/explore";

type Ctx = HighlightContext;
type ThemeOption = { id: string; title: string; parentId: string | null };

type Props = { highlightId: string | null; themes: ThemeOption[]; currentThemeId: string | null; onChanged: () => void; onCreateTheme: () => void };

/** Right pane: the selected highlight in its transcript context, the player at that moment, tags, themes. */
export function DetailPane({ highlightId, themes, currentThemeId, onChanged, onCreateTheme }: Props) {
  const [loaded, setLoaded] = useState<{ id: string; ctx: Ctx | null }>({ id: "", ctx: null });
  const seek = usePlayer((s) => s.seek);

  useEffect(() => {
    if (!highlightId) return;
    let cancelled = false;
    void getHighlightContext({ highlightId }).then((res) => {
      if (cancelled) return;
      if (!res.ok) { toast.error(res.error); setLoaded({ id: highlightId, ctx: null }); return; }
      setLoaded({ id: highlightId, ctx: res.data });
    });
    return () => { cancelled = true; };
  }, [highlightId]);

  if (!highlightId) return <p className="text-sm text-muted-foreground">Select a highlight to read it in context. Use j and k to move through the list.</p>;
  const ctx = loaded.id === highlightId ? loaded.ctx : null;
  if (!ctx) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const { highlight: h, segments } = ctx;
  const hasRecording = !!h.source.recordingPath;

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div>
        <div className="flex flex-wrap items-center gap-1">
          {h.tags.map((t) => <Badge key={t.tag.id} variant="outline" className="gap-1"><span className="size-2 rounded-full" style={{ background: tagColor(t.tag) }} />{t.tag.name}</Badge>)}
          {!h.tags.length ? <span className="text-xs text-muted-foreground">No tags</span> : null}
        </div>
        <blockquote className="mt-2 whitespace-pre-line border-l-2 pl-3 text-base leading-relaxed">{h.text}</blockquote>
        {h.note ? <p className="mt-2 text-muted-foreground">{h.note}</p> : null}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <dt>Who</dt><dd>{h.startSegment.speaker ?? "—"}{h.source.participants.length ? ` · ${h.source.participants.map((p) => [p.participant.name, p.participant.role, p.participant.company].filter(Boolean).join(", ")).join("; ")}` : ""}</dd>
        <dt>Where</dt><dd><Link className="hover:underline" href={`/projects/${h.source.project.id}`}>{h.source.project.name}</Link>{h.source.project.productArea ? ` · ${h.source.project.productArea}` : ""}</dd>
        <dt>Source</dt><dd>{h.source.title}{h.source.date ? ` · ${formatDate(h.source.date)}` : ""}{h.startSegment.startMs != null ? ` · ${formatClock(h.startSegment.startMs)}` : ""}</dd>
      </dl>

      {hasRecording ? <MediaPlayer key={h.source.id} sourceId={h.source.id} mime={h.source.recordingMime} durationMs={h.source.durationMs} /> : null}

      <div className="flex flex-wrap gap-2">
        {hasRecording && h.startSegment.startMs != null ? <Button size="sm" variant="outline" onClick={() => seek(h.startSegment.startMs!)}>Play from here</Button> : null}
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/projects/${h.source.project.id}/sources/${h.source.id}?highlight=${h.id}`} />}><ExternalLink className="size-4" /> Open transcript</Button>
        <AddToThemePicker themes={themes} highlightIds={[h.id]} excludeIds={h.themes.map((t) => t.theme.id)} onDone={onChanged} onCreate={onCreateTheme} trigger={<Button size="sm" variant="outline" />} label={<><FolderPlus className="size-4" /> Add to theme</>} />
      </div>

      {h.themes.length ? (
        <div>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">In themes</h3>
          <ul className="flex flex-wrap gap-1">
            {h.themes.map((t) => (
              <li key={t.theme.id}>
                <Badge variant={t.theme.id === currentThemeId ? "default" : "secondary"} className="gap-1 pr-1">
                  {t.theme.title}
                  <button type="button" aria-label={`Remove from ${t.theme.title}`} className="rounded-sm hover:bg-foreground/10" onClick={async () => { const r = await removeFromTheme({ themeId: t.theme.id, highlightId: h.id }); if (!r.ok) toast.error(r.error); else onChanged(); }}><X className="size-3" /></button>
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">In context</h3>
        <ol className="flex flex-col gap-2 rounded-md border p-3">
          {segments.map((s) => {
            const inside = s.order >= h.startSegment.order && s.order <= ctx.highlight.endSegment.order;
            return (
              <li key={s.id} className={inside ? "" : "opacity-60"}>
                <div className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{s.speaker ?? ""}</span>{s.startMs != null ? <button type="button" className="ml-1 tabular-nums hover:underline" onClick={() => hasRecording && seek(s.startMs!)}>{formatClock(s.startMs)}</button> : null}</div>
                <p className="whitespace-pre-wrap leading-snug">{inside ? <SegmentWithMark text={s.text} order={s.order} h={h} end={ctx.highlight.endSegment.order} /> : s.text}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function SegmentWithMark({ text, order, h, end }: { text: string; order: number; h: Ctx["highlight"]; end: number }) {
  const from = order === h.startSegment.order ? h.startOffset : 0;
  const to = order === end ? h.endOffset : text.length;
  return (
    <>
      {text.slice(0, from)}
      <mark className="rounded-sm bg-yellow-200/70 px-0.5 dark:bg-yellow-500/30">{text.slice(from, to)}</mark>
      {text.slice(to)}
    </>
  );
}
