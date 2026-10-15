"use client";

import { useMemo, useState } from "react";
import { Plus, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { tagColor, type TagLike } from "@/lib/colors";
import { createTag } from "@/server/actions/tags";

type Props = {
  allTags: TagLike[];
  selectedIds: string[];
  onToggle: (tag: TagLike, selected: boolean) => void;
  onTagCreated: (tag: TagLike) => void;
  trigger?: React.ReactElement;
  align?: "start" | "end";
};

/** Searchable multi-select over the global tag list, grouped, with inline creation. */
export function TagPicker({ allTags, selectedIds, onToggle, onTagCreated, trigger, align = "start" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = new Set(selectedIds);
  const q = query.trim().toLowerCase();
  const groups = useMemo(() => {
    const filtered = q ? allTags.filter((t) => t.name.toLowerCase().includes(q) || t.group?.name.toLowerCase().includes(q)) : allTags;
    const map = new Map<string, TagLike[]>();
    for (const t of filtered) {
      const key = t.group?.name ?? "Ungrouped";
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return [...map.entries()];
  }, [allTags, q]);
  const canCreate = q.length > 0 && !allTags.some((t) => t.name.toLowerCase() === q);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
      <PopoverTrigger render={trigger ?? <Button type="button" variant="outline" size="xs" />}>
        {trigger ? null : <><Tag className="size-3.5" /> Tags</>}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align={align}>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search or create a tag…" value={query} onValueChange={setQuery} autoFocus />
          <CommandList>
            <CommandEmpty>No tags.</CommandEmpty>
            {groups.map(([group, tags]) => (
              <CommandGroup key={group} heading={group}>
                {tags.map((t) => {
                  const on = selected.has(t.id);
                  return (
                    <CommandItem key={t.id} value={t.id} onSelect={() => onToggle(t, !on)}>
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: tagColor(t) }} />
                      <span className="flex-1 truncate">{t.name}</span>
                      {on ? <span className="text-xs text-muted-foreground">✓</span> : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
            {canCreate ? (
              <CommandGroup>
                <CommandItem
                  value={`create:${q}`}
                  onSelect={async () => {
                    const res = await createTag({ name: query.trim() });
                    if (!res.ok) { toast.error(res.error); return; }
                    onTagCreated(res.data);
                    onToggle(res.data, true);
                    setQuery("");
                  }}
                >
                  <Plus className="size-4" /> Create “{query.trim()}”
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
