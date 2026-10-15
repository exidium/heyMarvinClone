"use client";

import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/shared/ConfirmButton";
import { SourceDialog } from "@/components/sources/SourceDialog";
import type { PickedParticipant } from "@/components/participants/ParticipantPicker";
import { deleteSource } from "@/server/actions/sources";

type Props = { projectId: string; source: { id: string; title: string; date: Date | null; participants: PickedParticipant[] } };

export function SourceActions({ projectId, source }: Props) {
  const router = useRouter();
  return (
    <>
      <SourceDialog projectId={projectId} initial={source} trigger={<Button variant="outline" size="sm"><Pencil className="size-4" /> Edit</Button>} />
      <ConfirmButton
        title={`Delete “${source.title}”?`}
        description="Removes the transcript, recording and every highlight in this source."
        onConfirm={async () => {
          const res = await deleteSource({ id: source.id });
          if (res.ok) router.push(`/projects/${projectId}`);
          return res;
        }}
      >
        <Trash2 className="size-4" /> Delete
      </ConfirmButton>
    </>
  );
}
