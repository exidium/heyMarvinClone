"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/transcript/time";
import { usePlayer } from "@/stores/player";

export type ViewSegment = { id: string; order: number; speaker: string | null; startMs: number | null; endMs: number | null; text: string };

/** Read-only transcript: click a line to seek; the line being played is marked. Replaced by the editor in M5 for editors. */
export function TranscriptView({ segments, hasRecording }: { segments: ViewSegment[]; hasRecording: boolean }) {
  const currentMs = usePlayer((s) => s.currentMs);
  const playing = usePlayer((s) => s.playing);
  const seek = usePlayer((s) => s.seek);
  const activeRef = useRef<HTMLLIElement>(null);

  const activeId = findActive(segments, currentMs);
  useEffect(() => {
    if (playing) activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId, playing]);

  return (
    <ol className="flex flex-col gap-1 text-sm">
      {segments.map((s) => {
        const active = s.id === activeId;
        const clickable = hasRecording && s.startMs != null;
        return (
          <li
            key={s.id}
            ref={active ? activeRef : undefined}
            data-segment-id={s.id}
            className={cn("grid grid-cols-[150px_1fr] gap-3 rounded-md px-2 py-1.5", active && "bg-accent", clickable && "cursor-pointer hover:bg-muted/60")}
            onClick={clickable ? () => seek(s.startMs!) : undefined}
          >
            <div className="truncate text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{s.speaker ?? ""}</span>
              {s.startMs != null ? <span className="ml-1 tabular-nums">{formatClock(s.startMs)}</span> : null}
            </div>
            <p className="whitespace-pre-wrap">{s.text}</p>
          </li>
        );
      })}
    </ol>
  );
}

function findActive(segments: ViewSegment[], ms: number): string | null {
  let active: ViewSegment | null = null;
  for (const s of segments) {
    if (s.startMs == null) continue;
    if (s.startMs <= ms) active = s; else break;
  }
  if (!active) return null;
  if (active.endMs != null && ms >= active.endMs) return null;
  return active.id;
}
