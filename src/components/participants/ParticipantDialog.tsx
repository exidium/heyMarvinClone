"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createParticipant, updateParticipant } from "@/server/actions/participants";

type Initial = { id: string; name: string; role: string | null; company: string | null; segment: string | null; toolsUsed: string[]; notes: string | null };
type Facets = { roles: string[]; companies: string[]; segments: string[]; tools: string[] };
type Props = { trigger: React.ReactElement; initial?: Initial; facets: Facets };

/** Create or edit a participant. Fixed attributes get datalist autocomplete so values stay consistent. */
export function ParticipantDialog({ trigger, initial, facets }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [segment, setSegment] = useState(initial?.segment ?? "");
  const [tools, setTools] = useState(initial?.toolsUsed.join(", ") ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const fields = { name, role: role || null, company: company || null, segment: segment || null, toolsUsed: tools.split(",").map((t) => t.trim()).filter(Boolean), notes: notes || null };
      const res = initial ? await updateParticipant({ id: initial.id, ...fields }) : await createParticipant(fields);
      if (!res.ok) { toast.error(res.error); return; }
      setOpen(false);
      toast.success(initial ? "Participant updated" : "Participant created");
      if (!initial) { setName(""); setRole(""); setCompany(""); setSegment(""); setTools(""); setNotes(""); }
      router.refresh();
    });
  };

  const list = (id: string, values: string[]) => <datalist id={id}>{values.map((v) => <option key={v} value={v} />)}</datalist>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="contents">
          <DialogHeader><DialogTitle>{initial ? "Edit participant" : "New participant"}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="pt-name">Name or alias</FieldLabel>
              <Input id="pt-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus required maxLength={200} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="pt-role">Role</FieldLabel>
                <Input id="pt-role" list="pt-roles" value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} />
                {list("pt-roles", facets.roles)}
              </Field>
              <Field>
                <FieldLabel htmlFor="pt-company">Company</FieldLabel>
                <Input id="pt-company" list="pt-companies" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={200} />
                {list("pt-companies", facets.companies)}
              </Field>
              <Field>
                <FieldLabel htmlFor="pt-segment">Segment</FieldLabel>
                <Input id="pt-segment" list="pt-segments" value={segment} onChange={(e) => setSegment(e.target.value)} maxLength={120} />
                {list("pt-segments", facets.segments)}
              </Field>
              <Field>
                <FieldLabel htmlFor="pt-tools">Tools used</FieldLabel>
                <Input id="pt-tools" value={tools} onChange={(e) => setTools(e.target.value)} placeholder="Excel, SpiceBench" />
                <FieldDescription>Comma separated.</FieldDescription>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="pt-notes">Notes</FieldLabel>
              <Textarea id="pt-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || !name.trim()}>{pending ? "Saving…" : initial ? "Save" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
