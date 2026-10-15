"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/shared/ConfirmButton";
import { deleteSavedView } from "@/server/actions/views";

export function DeleteViewButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmButton title={`Delete view “${name}”?`} description="Only the saved filter is removed; nothing else changes." variant="ghost" size="sm" onConfirm={async () => { const r = await deleteSavedView({ id }); if (r.ok) router.push("/search"); return r; }}>
      <Trash2 className="size-4" /> Delete view
    </ConfirmButton>
  );
}
