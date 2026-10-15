"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { addToTheme } from "@/server/actions/themes";

type ThemeOption = { id: string; title: string; parentId: string | null };
type Props = { themes: ThemeOption[]; highlightIds: string[]; excludeIds?: string[]; onDone: () => void; onCreate: () => void; trigger?: React.ReactElement; label?: React.ReactNode };

export function AddToThemePicker({ themes, highlightIds, excludeIds = [], onDone, onCreate, trigger, label }: Props) {
  const [open, setOpen] = useState(false);
  const options = themes.filter((t) => !excludeIds.includes(t.id));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger ?? <Button type="button" variant="outline" size="sm" />}>{label ?? "Add to theme"}</PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Find a theme…" autoFocus />
          <CommandList>
            <CommandEmpty>No themes match.</CommandEmpty>
            <CommandGroup>
              {options.map((t) => (
                <CommandItem key={t.id} value={t.title} onSelect={async () => { const r = await addToTheme({ themeId: t.id, highlightIds }); if (!r.ok) toast.error(r.error); else { toast.success(`Added to “${t.title}”`); onDone(); } setOpen(false); }}>
                  <span className="truncate">{t.title}</span>
                </CommandItem>
              ))}
              <CommandItem value="__create" onSelect={() => { setOpen(false); onCreate(); }}><Plus className="size-4" /> New theme…</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
