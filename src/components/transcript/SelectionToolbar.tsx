"use client";

import { Highlighter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TagPicker } from "@/components/transcript/TagPicker";
import type { TagLike } from "@/lib/colors";

type Props = {
  position: { top: number; left: number };
  allTags: TagLike[];
  onHighlight: (tagIds: string[]) => void;
  onTagCreated: (tag: TagLike) => void;
};

/** Floats above the current text selection: highlight as-is, or pick a tag to highlight with. */
export function SelectionToolbar({ position, allTags, onHighlight, onTagCreated }: Props) {
  return (
    <div
      className="absolute z-20 flex items-center gap-1 rounded-md border bg-popover p-1 shadow-md"
      style={{ top: position.top, left: position.left, transform: "translate(0, -100%)" }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <Button type="button" size="xs" onClick={() => onHighlight([])}><Highlighter className="size-3.5" /> Highlight</Button>
      <TagPicker allTags={allTags} selectedIds={[]} onToggle={(tag) => onHighlight([tag.id])} onTagCreated={onTagCreated} trigger={<Button type="button" size="xs" variant="outline" />} />
    </div>
  );
}
