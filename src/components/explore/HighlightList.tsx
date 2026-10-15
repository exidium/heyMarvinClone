"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { tagColor } from "@/lib/colors";
import { formatDate } from "@/lib/format";
import { formatClock } from "@/lib/transcript/time";
import { cn } from "@/lib/utils";
import type { ExplorerHighlight } from "@/server/queries/explore";

type Props = {
  rows: ExplorerHighlight[];
  total: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  draggable: boolean;
  title: string;
};

/** Middle pane: the highlights under the selected node. j/k or arrows move; cards can be dragged onto themes. */
export function HighlightList({ rows, total, selectedId, onSelect, draggable, title }: Props) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (!["j", "k", "ArrowDown", "ArrowUp"].includes(e.key) || !rows.length) return;
      e.preventDefault();
      const i = rows.findIndex((r) => r.id === selectedId);
      const next = e.key === "j" || e.key === "ArrowDown" ? Math.min(rows.length - 1, i + 1) : Math.max(0, i - 1);
      onSelect(rows[next].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, selectedId, onSelect]);

  useEffect(() => {
    if (!selectedId) return;
    listRef.current?.querySelector<HTMLElement>(`[data-id="${selectedId}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="truncate text-sm font-medium">{title}</h2>
        <span className="text-xs text-muted-foreground">{total > rows.length ? `${rows.length} of ${total}` : total}</span>
      </div>
      {rows.length ? (
        <ol ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {rows.map((h) => {
            const selected = h.id === selectedId;
            const participants = h.source.participants.map((p) => p.participant.name).join(", ");
            return (
              <li
                key={h.id}
                data-id={h.id}
                draggable={draggable}
                onDragStart={(e) => { e.dataTransfer.setData("text/highlight-ids", h.id); e.dataTransfer.effectAllowed = "copy"; }}
                onClick={() => onSelect(h.id)}
                className={cn("cursor-pointer rounded-lg border p-3 text-sm transition-colors", selected ? "border-foreground/40 bg-accent" : "hover:bg-muted/50", draggable && "cursor-grab active:cursor-grabbing")}
              >
                <blockquote className="line-clamp-4 border-l-2 pl-2 leading-snug" style={{ borderColor: h.tags[0] ? tagColor(h.tags[0].tag) : "#9ca3af" }}>{h.text}</blockquote>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {h.tags.map((t) => <Badge key={t.tag.id} variant="outline" className="gap-1"><span className="size-2 rounded-full" style={{ background: tagColor(t.tag) }} />{t.tag.name}</Badge>)}
                  <span className="truncate">{h.startSegment.speaker ?? (participants || "Unknown speaker")}</span>
                  <span>·</span>
                  <span className="truncate">{h.source.project.name}</span>
                  {h.source.date ? <span>· {formatDate(h.source.date)}</span> : null}
                  {h.startSegment.startMs != null ? <span>· {formatClock(h.startSegment.startMs)}</span> : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      )}
    </div>
  );
}
