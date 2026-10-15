"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { findPath, PIVOT_LABEL, PIVOTS, type Pivot, type TreeNode } from "@/lib/explore";

type Props = {
  pivot: Pivot;
  nodes: TreeNode[];
  selected: string;
  total: number;
  onSelectPivot: (p: Pivot) => void;
  onSelectNode: (key: string) => void;
  onDropHighlights: (themeId: string, highlightIds: string[]) => void;
  onNewTheme: (parentId: string | null) => void;
};

/** Left pane: pivot switcher and a collapsible tree with counts. Theme nodes accept dropped highlights. */
export function TreePane({ pivot, nodes, selected, total, onSelectPivot, onSelectNode, onDropHighlights, onNewTheme }: Props) {
  // The path to the selected node is always expanded; the user's explicit opens and closes layer on top.
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [over, setOver] = useState<string | null>(null);
  const open = useMemo(() => {
    const path = findPath(nodes, selected) ?? [];
    const o = new Set([...path, ...opened]);
    for (const c of closed) o.delete(c);
    return o;
  }, [nodes, selected, opened, closed]);

  const toggle = (key: string) => {
    if (open.has(key)) { setClosed((p) => new Set([...p, key])); setOpened((p) => { const n = new Set(p); n.delete(key); return n; }); }
    else { setOpened((p) => new Set([...p, key])); setClosed((p) => { const n = new Set(p); n.delete(key); return n; }); }
  };

  const render = (node: TreeNode, depth: number) => {
    const isOpen = open.has(node.key);
    const isSel = node.key === selected;
    const droppable = pivot === "themes" && node.key.startsWith("theme:");
    return (
      <li key={node.key}>
        <div
          className={cn("group flex items-center gap-1 rounded-md py-1 pr-1 text-sm", isSel ? "bg-accent font-medium" : "hover:bg-muted/60", over === node.key && "ring-2 ring-primary/60")}
          style={{ paddingLeft: depth * 14 + 4 }}
          onDragOver={droppable ? (e) => { e.preventDefault(); setOver(node.key); } : undefined}
          onDragLeave={droppable ? () => setOver(null) : undefined}
          onDrop={droppable ? (e) => { e.preventDefault(); setOver(null); const ids = e.dataTransfer.getData("text/highlight-ids"); if (ids) onDropHighlights(node.key.slice("theme:".length), ids.split(",")); } : undefined}
        >
          <button type="button" aria-label={isOpen ? "Collapse" : "Expand"} className={cn("size-5 shrink-0 rounded text-muted-foreground hover:bg-muted", !node.children && "invisible")} onClick={() => toggle(node.key)}>
            {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
          <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => onSelectNode(node.key)} aria-current={isSel ? "true" : undefined}>
            <span className="truncate">{node.label}</span>
            <span className="ml-auto shrink-0 tabular-nums text-xs text-muted-foreground">{node.count}</span>
          </button>
          {droppable ? (
            <button type="button" aria-label={`New sub-theme in ${node.label}`} className="invisible size-5 rounded text-muted-foreground hover:bg-muted group-hover:visible" onClick={() => onNewTheme(node.key.slice("theme:".length))}>
              <FolderPlus className="size-3.5" />
            </button>
          ) : null}
        </div>
        {node.children && isOpen ? <ul>{node.children.map((c) => render(c, depth + 1))}</ul> : null}
      </li>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex rounded-md border p-0.5 text-xs">
        {PIVOTS.map((p) => (
          <button key={p} type="button" className={cn("flex-1 rounded px-2 py-1", pivot === p ? "bg-accent font-medium" : "text-muted-foreground hover:text-foreground")} onClick={() => onSelectPivot(p)}>
            {PIVOT_LABEL[p]}
          </button>
        ))}
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto pr-1">
        <li>
          <button type="button" className={cn("flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-sm", selected === "" ? "bg-accent font-medium" : "hover:bg-muted/60")} onClick={() => onSelectNode("")}>
            <span className="pl-5">All highlights</span>
            <span className="ml-auto tabular-nums text-xs text-muted-foreground">{total}</span>
          </button>
        </li>
        {nodes.map((n) => render(n, 0))}
      </ul>
      {pivot === "themes" ? (
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => onNewTheme(null)}><FolderPlus className="size-4" /> New theme</Button>
      ) : null}
    </div>
  );
}
