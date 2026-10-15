"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toDateInput } from "@/lib/format";
import { createProject, updateProject } from "@/server/actions/projects";

type Initial = {
  id: string; name: string; goal: string | null; productArea: string | null;
  startDate: Date | null; endDate: Date | null; access: "OPEN" | "RESTRICTED";
};

type Props = { trigger: React.ReactElement; initial?: Initial; productAreas: string[] };

const ACCESS_LABEL = { OPEN: "Open to everyone (viewer)", RESTRICTED: "Restricted to named members" } as const;

/** Create or edit a project. */
export function ProjectDialog({ trigger, initial, productAreas }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [goal, setGoal] = useState(initial?.goal ?? "");
  const [productArea, setProductArea] = useState(initial?.productArea ?? "");
  const [startDate, setStartDate] = useState(toDateInput(initial?.startDate));
  const [endDate, setEndDate] = useState(toDateInput(initial?.endDate));
  const [access, setAccess] = useState<"OPEN" | "RESTRICTED">(initial?.access ?? "OPEN");
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const fields = { name, goal: goal || null, productArea: productArea || null, startDate: startDate || null, endDate: endDate || null, access };
      const res = initial ? await updateProject({ id: initial.id, ...fields }) : await createProject(fields);
      if (!res.ok) { toast.error(res.error); return; }
      setOpen(false);
      if (initial) { toast.success("Project updated"); router.refresh(); }
      else router.push(`/projects/${res.data.id}`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="contents">
          <DialogHeader><DialogTitle>{initial ? "Edit project" : "New project"}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="p-name">Name</FieldLabel>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus required maxLength={200} placeholder="2026-07 Discovery - RF Engineer Workflows" />
            </Field>
            <Field>
              <FieldLabel htmlFor="p-goal">Goal</FieldLabel>
              <Textarea id="p-goal" value={goal} onChange={(e) => setGoal(e.target.value)} rows={3} placeholder="What question does this study answer?" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="p-area">Product area</FieldLabel>
                <Input id="p-area" list="product-areas" value={productArea} onChange={(e) => setProductArea(e.target.value)} maxLength={100} placeholder="RF" />
                <datalist id="product-areas">{productAreas.map((a) => <option key={a} value={a} />)}</datalist>
              </Field>
              <Field>
                <FieldLabel htmlFor="p-access">Access</FieldLabel>
                <Select value={access} onValueChange={(v) => setAccess((v as "OPEN" | "RESTRICTED") ?? "OPEN")}>
                  <SelectTrigger id="p-access" className="w-full"><SelectValue>{(v: string) => ACCESS_LABEL[v as keyof typeof ACCESS_LABEL] ?? "Access"}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">{ACCESS_LABEL.OPEN}</SelectItem>
                    <SelectItem value="RESTRICTED">{ACCESS_LABEL.RESTRICTED}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="p-start">Start date</FieldLabel>
                <Input id="p-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="p-end">End date</FieldLabel>
                <Input id="p-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </Field>
            </div>
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
