"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/stores/player";
import { setSourceDuration } from "@/server/actions/sources";

type Props = { sourceId: string; mime: string | null; durationMs: number | null };

/** <video> or <audio> fed by the media route. Reports time to the player store and obeys seek requests. */
export function MediaPlayer({ sourceId, mime, durationMs }: Props) {
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const seekRequest = usePlayer((s) => s.seekRequest);
  const setCurrent = usePlayer((s) => s.setCurrent);
  const setPlaying = usePlayer((s) => s.setPlaying);
  const isVideo = (mime ?? "").startsWith("video/");
  const src = `/api/media/${sourceId}/recording`;

  useEffect(() => {
    const el = ref.current;
    if (!el || !seekRequest) return;
    el.currentTime = seekRequest.ms / 1000;
    void el.play().catch(() => {});
  }, [seekRequest]);

  const common = {
    ref,
    src,
    controls: true,
    preload: "metadata" as const,
    onTimeUpdate: () => setCurrent(Math.round((ref.current?.currentTime ?? 0) * 1000)),
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onLoadedMetadata: () => {
      const d = ref.current?.duration;
      if (durationMs == null && d && Number.isFinite(d)) void setSourceDuration({ id: sourceId, durationMs: Math.round(d * 1000) });
    },
  };

  return isVideo ? (
    <video {...common} className="w-full rounded-md bg-black" />
  ) : (
    <audio {...common} className="w-full" />
  );
}
