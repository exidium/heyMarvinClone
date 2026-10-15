"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ParticipantPicker, type PickedParticipant } from "@/components/participants/ParticipantPicker";
import { toDateInput } from "@/lib/format";
import { createSource, updateSource } from "@/server/actions/sources";

type Initial = { id: string; title: string; date: Date | null; participants: PickedParticipant[] };
type Props = { projectId: string; trigger: React.ReactElement; initial?: Initial };

/** Create a source (session) inside a project, or edit its title, date and participants. */
export function SourceDialog({ projectId, trigger, initial }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(toDateInput(initial?.date));
  const [participants, setParticipants] = useState<PickedParticipant[]>(initial?.participants ?? []);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const participantIds = participants.map((p) => p.id);
      const res = initial
        ? await updateSource({ id: initial.id, title, date: date || null, participantIds })
        : await createSource({ projectId, title, date: date || null, participantIds });
      if (!res.ok) { toast.error(res.error); return; }
      setOpen(false);
      if (initial) { toast.success("Source updated"); router.refresh(); }
      else router.push(`/projects/${projectId}/sources/${res.data.id}`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>{initial ? "Edit source" : "New source"}</DialogTitle>
            {!initial ? <DialogDescription>A source is one session: a transcript and, optionally, its recording. Upload the files on the next screen.</DialogDescription> : null}
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="s-title">Title</FieldLabel>
              <Input id="s-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required maxLength={300} placeholder="Interview with Jane Doe" />
            </Field>
            <Field>
              <FieldLabel htmlFor="s-date">Session date</FieldLabel>
              <Input id="s-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-fit" />
            </Field>
            <Field>
              <FieldLabel>Participants</FieldLabel>
              <ParticipantPicker value={participants} onChange={setParticipants} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || !title.trim()}>{pending ? "Saving…" : initial ? "Save" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
