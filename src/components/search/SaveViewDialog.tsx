"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createSavedView } from "@/server/actions/views";
import type { SearchFilters } from "@/lib/validation/search";

export function SaveViewDialog({ filters }: { filters: SearchFilters }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isShared, setIsShared] = useState(true);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}><Bookmark className="size-4" /> Save view</DialogTrigger>
      <DialogContent>
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await createSavedView({ name, isShared, filters });
              if (!res.ok) { toast.error(res.error); return; }
              setOpen(false);
              toast.success("View saved");
              router.push(`/views/${res.data.id}`);
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Save this search as a view</DialogTitle>
            <DialogDescription>The keyword and every filter are stored. Views appear in the sidebar.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="view-name">Name</FieldLabel>
            <Input id="view-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus required placeholder="Onboarding pain, RF engineers" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isShared} onCheckedChange={(v) => setIsShared(v === true)} /> Share with the team
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || !name.trim()}>{pending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
