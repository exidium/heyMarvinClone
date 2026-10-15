"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SpeakerTarget = { segmentId: string; speaker: string | null; sameSpeakerCount: number; rect: { top: number; left: number } };
type Participant = { id: string; name: string };

type Props = {
  target: SpeakerTarget;
  participants: Participant[];
  onSave: (input: { speaker: string | null; participantId: string | null; scope: "one" | "all" }) => Promise<void>;
  onClose: () => void;
};

/** Small card anchored to a segment's gutter: rename the speaker (this line or all) and link a participant. */
export function SpeakerPopover({ target, participants, onSave, onClose }: Props) {
  const [name, setName] = useState(target.speaker ?? "");
  const [participantId, setParticipantId] = useState<string>("");
  const [scope, setScope] = useState<"one" | "all">(target.sameSpeakerCount > 1 ? "all" : "one");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="absolute z-30 w-72 rounded-lg border bg-popover p-3 text-sm shadow-md" style={{ top: target.rect.top, left: target.rect.left }} onMouseDown={(e) => e.stopPropagation()}>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          const p = participants.find((x) => x.id === participantId);
          await onSave({ speaker: (name.trim() || p?.name) ?? null, participantId: participantId || null, scope });
          setPending(false);
        }}
      >
        <div className="flex flex-col gap-1">
          <Label htmlFor="sp-name">Speaker name</Label>
          <Input id="sp-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Name shown in the transcript" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="sp-participant">Link to participant</Label>
          <Select value={participantId} onValueChange={(v) => { const id = (v as string) ?? ""; setParticipantId(id); const p = participants.find((x) => x.id === id); if (p && !name.trim()) setName(p.name); }}>
            <SelectTrigger id="sp-participant" className="w-full" size="sm"><SelectValue>{(v: string) => participants.find((p) => p.id === v)?.name ?? "None"}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {participants.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {target.sameSpeakerCount > 1 ? (
          <div className="flex gap-3 text-xs">
            <label className="flex items-center gap-1"><input type="radio" checked={scope === "all"} onChange={() => setScope("all")} /> All {target.sameSpeakerCount} lines by “{target.speaker}”</label>
            <label className="flex items-center gap-1"><input type="radio" checked={scope === "one"} onChange={() => setScope("one")} /> This line</label>
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    </div>
  );
}
