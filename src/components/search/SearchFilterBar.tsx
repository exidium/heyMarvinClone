"use client";

import { useState, useTransition } from "react";
import { useQueryStates } from "nuqs";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { TagPicker } from "@/components/transcript/TagPicker";
import { searchParsers, urlKeys } from "@/lib/search-params";
import { tagColor, type TagLike } from "@/lib/colors";
import type { SearchFacets } from "@/server/queries/facets";

/** A multi-select over a fixed list of strings. */
function MultiPick({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const set = new Set(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button type="button" variant="outline" size="sm" className="justify-between" />}>
        <span className="truncate">{label}{value.length ? ` · ${value.length}` : ""}</span>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Filter ${label.toLowerCase()}…`} autoFocus />
          <CommandList>
            <CommandEmpty>Nothing matches.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.value} value={o.label} onSelect={() => onChange(set.has(o.value) ? value.filter((v) => v !== o.value) : [...value, o.value])}>
                  <span className="flex-1 truncate">{o.label}</span>
                  {set.has(o.value) ? <span className="text-xs text-muted-foreground">✓</span> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function SearchFilterBar({ facets }: { facets: SearchFacets }) {
  const [f, setF] = useQueryStates(searchParsers, { urlKeys, shallow: false, history: "push" });
  const [q, setQ] = useState(f.q);
  const [, start] = useTransition();
  const update = (patch: Partial<typeof f>) => start(() => { void setF({ ...patch, page: 1 }); });
  const asOptions = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));
  const selectedTags = facets.tags.filter((t) => f.tagIds.includes(t.id));
  const active = f.projectIds.length + f.productAreas.length + f.tagIds.length + f.roles.length + f.companies.length + f.segments.length + f.tools.length + (f.dateFrom ? 1 : 0) + (f.dateTo ? 1 : 0);

  return (
    <div className="flex flex-col gap-3">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); update({ q }); }}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder='Search transcripts and highlights… use quotes for a phrase, -word to exclude' className="pl-8" aria-label="Keyword" />
        </div>
        <Button type="submit" size="sm" className="h-8">Search</Button>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border p-0.5 text-xs">
          {(["highlights", "transcript"] as const).map((s) => (
            <button key={s} type="button" className={`rounded px-2 py-1 ${f.scope === s ? "bg-accent font-medium" : "text-muted-foreground"}`} onClick={() => update({ scope: s })}>{s === "highlights" ? "Highlights" : "Transcript lines"}</button>
          ))}
        </div>
        <MultiPick label="Project" options={facets.projects.map((p) => ({ value: p.id, label: p.name }))} value={f.projectIds} onChange={(v) => update({ projectIds: v })} />
        <MultiPick label="Product area" options={asOptions(facets.productAreas)} value={f.productAreas} onChange={(v) => update({ productAreas: v })} />
        <TagPicker
          allTags={facets.tags as TagLike[]}
          selectedIds={f.tagIds}
          onToggle={(t, on) => update({ tagIds: on ? [...f.tagIds, t.id] : f.tagIds.filter((x) => x !== t.id) })}
          onTagCreated={() => {}}
          trigger={<Button type="button" variant="outline" size="sm" />}
        />
        {f.tagIds.length > 1 ? (
          <button type="button" className="text-xs text-muted-foreground underline" onClick={() => update({ tagMode: f.tagMode === "any" ? "all" : "any" })}>
            {f.tagMode === "any" ? "any of these tags" : "all of these tags"}
          </button>
        ) : null}
        <MultiPick label="Role" options={asOptions(facets.participants.roles)} value={f.roles} onChange={(v) => update({ roles: v })} />
        <MultiPick label="Company" options={asOptions(facets.participants.companies)} value={f.companies} onChange={(v) => update({ companies: v })} />
        <MultiPick label="Segment" options={asOptions(facets.participants.segments)} value={f.segments} onChange={(v) => update({ segments: v })} />
        <MultiPick label="Tool" options={asOptions(facets.participants.tools)} value={f.tools} onChange={(v) => update({ tools: v })} />
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Label htmlFor="date-from" className="sr-only">From</Label>
          <Input id="date-from" type="date" value={f.dateFrom ?? ""} onChange={(e) => update({ dateFrom: e.target.value || null })} className="h-8 w-36" />
          –
          <Label htmlFor="date-to" className="sr-only">To</Label>
          <Input id="date-to" type="date" value={f.dateTo ?? ""} onChange={(e) => update({ dateTo: e.target.value || null })} className="h-8 w-36" />
        </span>
        {active || f.q ? <Button type="button" variant="ghost" size="sm" onClick={() => { setQ(""); start(() => { void setF(null); }); }}><X className="size-3.5" /> Clear</Button> : null}
      </div>
      {selectedTags.length ? (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((t) => (
            <Badge key={t.id} variant="outline" className="gap-1 pr-1">
              <span className="size-2 rounded-full" style={{ background: tagColor(t) }} />{t.name}
              <button type="button" aria-label={`Remove ${t.name}`} onClick={() => update({ tagIds: f.tagIds.filter((x) => x !== t.id) })}><X className="size-3" /></button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
