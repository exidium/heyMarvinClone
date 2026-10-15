"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryStates, parseAsString, parseAsStringLiteral } from "nuqs";
import { toast } from "sonner";
import { TreePane } from "./TreePane";
import { HighlightList } from "./HighlightList";
import { DetailPane } from "./DetailPane";
import { ThemeDialog, type ThemeInitial } from "./ThemeDialog";
import { ThemeHeader } from "./ThemeHeader";
import { findNode, parseKey, PIVOTS, type Pivot, type TreeNode } from "@/lib/explore";
import { addToTheme } from "@/server/actions/themes";
import type { ExplorerHighlight } from "@/server/queries/explore";

export const exploreParsers = {
  pivot: parseAsStringLiteral(PIVOTS).withDefault("projects"),
  node: parseAsString.withDefault(""),
  h: parseAsString,
};

type ThemeOption = { id: string; title: string; parentId: string | null };
type Props = {
  pivot: Pivot;
  node: string;
  tree: TreeNode[];
  total: number;
  rows: ExplorerHighlight[];
  listTotal: number;
  themes: ThemeOption[];
  theme: (ThemeInitial & { createdBy: { name: string | null; email: string } | null; _count: { highlights: number; children: number } }) | null;
  productAreas: string[];
  userId: string;
  isAdmin: boolean;
  initialHighlightId: string | null;
};

export function ExplorerShell({ pivot, node, tree, total, rows, listTotal, themes, theme, productAreas, userId, isAdmin, initialHighlightId }: Props) {
  const router = useRouter();
  const [, setParams] = useQueryStates(exploreParsers, { shallow: false, history: "push" });
  const [selectedId, setSelectedId] = useState<string | null>(initialHighlightId ?? rows[0]?.id ?? null);
  const [, start] = useTransition();
  const [dialog, setDialog] = useState<{ open: boolean; initial?: ThemeInitial | null; parentId?: string | null }>({ open: false });

  const selectNode = useCallback((key: string) => start(() => { void setParams({ node: key, h: null }); }), [setParams]);
  const selectPivot = useCallback((p: Pivot) => start(() => { void setParams({ pivot: p, node: "", h: null }); }), [setParams]);
  const selectHighlight = useCallback((id: string) => {
    setSelectedId(id);
    // Keep it in the URL without a server round trip, so the link is shareable.
    const url = new URL(window.location.href);
    url.searchParams.set("h", id);
    window.history.replaceState(null, "", url);
  }, []);

  const refresh = useCallback(() => router.refresh(), [router]);
  const dropOnTheme = useCallback(async (themeId: string, highlightIds: string[]) => {
    const r = await addToTheme({ themeId, highlightIds });
    if (!r.ok) toast.error(r.error); else { toast.success(`Added to “${themes.find((t) => t.id === themeId)?.title ?? "theme"}”`); refresh(); }
  }, [themes, refresh]);

  const key = parseKey(node);
  const title = node === "" ? "All highlights" : findNode(tree, node)?.label ?? "Highlights";
  const currentThemeId = key.kind === "theme" ? key.id ?? null : null;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_minmax(320px,38%)] gap-4 p-4" style={{ height: "calc(100vh - 57px)" }}>
      <aside className="min-h-0 overflow-hidden rounded-lg border p-2">
        <TreePane pivot={pivot} nodes={tree} selected={node} total={total} onSelectPivot={selectPivot} onSelectNode={selectNode} onDropHighlights={dropOnTheme} onNewTheme={(parentId) => setDialog({ open: true, parentId })} />
      </aside>
      <section className="min-h-0 overflow-hidden">
        {theme ? <ThemeHeader theme={theme} canDelete={isAdmin || theme.createdById === userId} onEdit={() => setDialog({ open: true, initial: theme })} onDeleted={() => selectNode("")} /> : null}
        <HighlightList rows={rows} total={listTotal} selectedId={selectedId} onSelect={selectHighlight} draggable={pivot === "themes"} title={title} />
      </section>
      <aside className="min-h-0 overflow-y-auto rounded-lg border p-4">
        <DetailPane highlightId={selectedId} themes={themes} currentThemeId={currentThemeId} onChanged={refresh} onCreateTheme={() => setDialog({ open: true, parentId: currentThemeId })} />
      </aside>
      <ThemeDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        initial={dialog.initial}
        parentId={dialog.parentId}
        themes={themes}
        productAreas={productAreas}
        onSaved={(t) => { if (pivot !== "themes" || !dialog.initial) start(() => { void setParams({ pivot: "themes", node: `theme:${t.id}`, h: null }); }); else refresh(); }}
      />
    </div>
  );
}
