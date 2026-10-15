"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTheme, updateTheme } from "@/server/actions/themes";

type Confidence = "LOW" | "MEDIUM" | "HIGH";
export type ThemeInitial = { id: string; title: string; description: string | null; confidence: Confidence | null; productArea: string | null; parentId: string | null; createdById?: string | null };
type ThemeOption = { id: string; title: string; parentId: string | null };

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: ThemeInitial | null;
  parentId?: string | null;
  themes: ThemeOption[];
  productAreas: string[];
  highlightIdsToAdd?: string[];
  onSaved: (theme: { id: string }) => void;
};

const CONF: Record<Confidence, string> = { LOW: "Low: a hunch, little evidence", MEDIUM: "Medium: several sources agree", HIGH: "High: consistent across studies" };

/** Create or edit a theme: a finding stated as a sentence, with optional description, confidence, area and parent. */
export function ThemeDialog({ open, onOpenChange, ...rest }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open ? <ThemeForm onOpenChange={onOpenChange} {...rest} /> : null}
      </DialogContent>
    </Dialog>
  );
}

/** Mounted fresh each time the dialog opens, so its state initialises from props without effects. */
function ThemeForm({ onOpenChange, initial, parentId, themes, productAreas, onSaved }: Omit<Props, "open">) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [confidence, setConfidence] = useState<Confidence | "">(initial?.confidence ?? "");
  const [productArea, setProductArea] = useState(initial?.productArea ?? "");
  const [parent, setParent] = useState<string>(initial?.parentId ?? parentId ?? "");
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const fields = { title, description: description || null, confidence: confidence || null, productArea: productArea || null, parentId: parent || null };
      const res = initial ? await updateTheme({ id: initial.id, ...fields }) : await createTheme(fields);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(initial ? "Theme updated" : "Theme created");
      onOpenChange(false);
      onSaved(res.data);
    });
  };

  const parentOptions = themes.filter((t) => t.id !== initial?.id);

  return (
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>{initial ? "Edit theme" : "New theme"}</DialogTitle>
            <DialogDescription>A theme is a finding. State it as a sentence someone could disagree with, then drag the highlights that support it onto it.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="th-title">Finding</FieldLabel>
              <Input id="th-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required maxLength={300} placeholder="Component selection is the most painful stage of the workflow" />
            </Field>
            <Field>
              <FieldLabel htmlFor="th-desc">Description</FieldLabel>
              <Textarea id="th-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What it means, what we should do, open questions." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="th-conf">Confidence</FieldLabel>
                <Select value={confidence} onValueChange={(v) => setConfidence((v as Confidence) ?? "")}>
                  <SelectTrigger id="th-conf" className="w-full"><SelectValue>{(v: string) => (v ? CONF[v as Confidence].split(":")[0] : "Not set")}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not set</SelectItem>
                    {(Object.keys(CONF) as Confidence[]).map((c) => <SelectItem key={c} value={c}>{CONF[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="th-area">Product area</FieldLabel>
                <Input id="th-area" list="theme-areas" value={productArea} onChange={(e) => setProductArea(e.target.value)} maxLength={100} />
                <datalist id="theme-areas">{productAreas.map((a) => <option key={a} value={a} />)}</datalist>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="th-parent">Parent theme</FieldLabel>
              <Select value={parent} onValueChange={(v) => setParent((v as string) ?? "")}>
                <SelectTrigger id="th-parent" className="w-full"><SelectValue>{(v: string) => parentOptions.find((t) => t.id === v)?.title ?? "Top level"}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Top level</SelectItem>
                  {parentOptions.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || !title.trim()}>{pending ? "Saving…" : initial ? "Save" : "Create"}</Button>
          </DialogFooter>
        </form>
  );
}
