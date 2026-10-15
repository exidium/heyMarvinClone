"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/shared/ConfirmButton";
import { deleteTheme } from "@/server/actions/themes";
import type { ThemeInitial } from "./ThemeDialog";

type Props = { theme: ThemeInitial & { createdBy: { name: string | null; email: string } | null; _count: { highlights: number; children: number } }; canDelete: boolean; onEdit: () => void; onDeleted: () => void };

const CONF_LABEL = { LOW: "Low confidence", MEDIUM: "Medium confidence", HIGH: "High confidence" } as const;

export function ThemeHeader({ theme, canDelete, onEdit, onDeleted }: Props) {
  return (
    <div className="mb-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-snug">{theme.title}</h2>
          {theme.description ? <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{theme.description}</p> : null}
          <div className="mt-2 flex flex-wrap gap-1 text-xs">
            {theme.confidence ? <Badge variant="outline">{CONF_LABEL[theme.confidence]}</Badge> : null}
            {theme.productArea ? <Badge variant="outline">{theme.productArea}</Badge> : null}
            <span className="text-muted-foreground">{theme._count.highlights} highlights{theme._count.children ? ` · ${theme._count.children} sub-themes` : ""}{theme.createdBy ? ` · by ${theme.createdBy.name ?? theme.createdBy.email}` : ""}</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="icon-sm" variant="ghost" aria-label="Edit theme" onClick={onEdit}><Pencil className="size-4" /></Button>
          {canDelete ? (
            <ConfirmButton title={`Delete theme “${theme.title}”?`} description="Highlights stay where they are; sub-themes move up one level." variant="ghost" size="icon-sm" ariaLabel="Delete theme" onConfirm={async () => { const r = await deleteTheme({ id: theme.id }); if (r.ok) onDeleted(); return r; }}>
              <Trash2 className="size-4" />
            </ConfirmButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
