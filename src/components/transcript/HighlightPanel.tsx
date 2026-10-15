"use client";

import { Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagPicker } from "@/components/transcript/TagPicker";
import { tagColor, type TagLike } from "@/lib/colors";
import { cn } from "@/lib/utils";
import type { ClientHighlight } from "./types";

type Props = {
  highlights: ClientHighlight[];
  segmentOrder: Map<string, number>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  canEdit: boolean;
  allTags: TagLike[];
  onSetTags: (id: string, tagIds: string[]) => void;
  onDelete: (id: string) => void;
  onTagCreated: (tag: TagLike) => void;
};

/** Side list of highlights in transcript order; orphaned ones at the bottom. */
export function HighlightPanel({ highlights, segmentOrder, selectedId, onSelect, canEdit, allTags, onSetTags, onDelete, onTagCreated }: Props) {
  const sorted = [...highlights].sort((a, b) => (segmentOrder.get(a.startSegmentId) ?? 0) - (segmentOrder.get(b.startSegmentId) ?? 0) || a.startOffset - b.startOffset);
  const active = sorted.filter((h) => h.status === "ACTIVE");
  const orphaned = sorted.filter((h) => h.status === "ORPHANED");

  const item = (h: ClientHighlight) => {
    const selected = h.id === selectedId;
    const color = h.tags.length ? tagColor(h.tags[0]) : "#9ca3af";
    return (
      <li
        key={h.id}
        data-highlight-item={h.id}
        className={cn("group rounded-md border p-2 text-sm transition-colors", selected ? "border-foreground/40 bg-accent" : "hover:bg-muted/50", h.status === "ORPHANED" && "opacity-60")}
        onClick={() => onSelect(h.id)}
      >
        <blockquote className="line-clamp-4 border-l-2 pl-2 text-[13px] leading-snug" style={{ borderColor: color }}>{h.text}</blockquote>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {h.tags.map((t) => (
            <Badge key={t.id} variant="outline" className="gap-1 pr-1">
              <span className="size-2 rounded-full" style={{ background: tagColor(t) }} />
              {t.name}
              {canEdit ? (
                <button type="button" aria-label={`Remove tag ${t.name}`} className="rounded-sm hover:bg-foreground/10" onClick={(e) => { e.stopPropagation(); onSetTags(h.id, h.tags.filter((x) => x.id !== t.id).map((x) => x.id)); }}>
                  <X className="size-3" />
                </button>
              ) : null}
            </Badge>
          ))}
          {canEdit ? (
            <span onClick={(e) => e.stopPropagation()}>
              <TagPicker
                allTags={allTags}
                selectedIds={h.tags.map((t) => t.id)}
                onToggle={(tag, on) => onSetTags(h.id, on ? [...h.tags.map((t) => t.id), tag.id] : h.tags.filter((t) => t.id !== tag.id).map((t) => t.id))}
                onTagCreated={onTagCreated}
                trigger={<Button type="button" variant="ghost" size="xs" className="text-muted-foreground" />}
              />
            </span>
          ) : null}
          {canEdit ? (
            <Button type="button" variant="ghost" size="icon-xs" className="ml-auto text-muted-foreground opacity-0 group-hover:opacity-100" aria-label="Delete highlight" onClick={(e) => { e.stopPropagation(); onDelete(h.id); }}>
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">Highlights</h2>
        <span className="text-xs text-muted-foreground">{active.length}</span>
      </div>
      {active.length ? <ul className="flex flex-col gap-2">{active.map(item)}</ul> : <p className="text-sm text-muted-foreground">{canEdit ? "Select text in the transcript to highlight it." : "No highlights yet."}</p>}
      {orphaned.length ? (
        <>
          <h3 className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Orphaned · text was removed</h3>
          <ul className="flex flex-col gap-2">{orphaned.map(item)}</ul>
        </>
      ) : null}
    </div>
  );
}
