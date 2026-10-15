"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { createParticipant, searchParticipants } from "@/server/actions/participants";

export type PickedParticipant = { id: string; name: string; role: string | null; company: string | null };

type Props = { value: PickedParticipant[]; onChange: (next: PickedParticipant[]) => void };

/** Multi-select of existing participants with inline creation. Reuse across projects without retyping. */
export function ParticipantPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const excludeIds = value.map((v) => v.id);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await searchParticipants({ q: query, excludeIds });
      if (cancelled) return;
      setLoading(false);
      setResults(res.ok ? res.data : []);
    }, 150);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, excludeIds.join(",")]);

  const trimmed = query.trim();
  const canCreate = trimmed.length > 0 && !results.some((r) => r.name.toLowerCase() === trimmed.toLowerCase());

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.map((p) => (
        <Badge key={p.id} variant="secondary" className="gap-1 pr-1">
          {p.name}
          <button type="button" aria-label={`Remove ${p.name}`} className="rounded-sm hover:bg-foreground/10" onClick={() => onChange(value.filter((v) => v.id !== p.id))}>
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
        <PopoverTrigger render={<Button type="button" variant="outline" size="xs" />}><Plus className="size-3.5" /> Add participant</PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search name, company, role…" value={query} onValueChange={setQuery} autoFocus />
            <CommandList>
              <CommandEmpty>{loading ? "Searching…" : "No participants found."}</CommandEmpty>
              <CommandGroup>
                {results.map((r) => (
                  <CommandItem key={r.id} value={r.id} onSelect={() => { onChange([...value, r]); setQuery(""); }}>
                    <span className="flex-1 truncate">{r.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{[r.role, r.company].filter(Boolean).join(" · ")}</span>
                  </CommandItem>
                ))}
                {canCreate ? (
                  <CommandItem
                    value={`create:${trimmed}`}
                    onSelect={async () => {
                      const res = await createParticipant({ name: trimmed, toolsUsed: [] });
                      if (res.ok) { onChange([...value, { id: res.data.id, name: res.data.name, role: res.data.role, company: res.data.company }]); setQuery(""); }
                    }}
                  >
                    <Plus className="size-4" /> Create “{trimmed}”
                  </CommandItem>
                ) : null}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
