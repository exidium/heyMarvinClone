"use client";

import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/shared/ConfirmButton";
import { ParticipantDialog } from "@/components/participants/ParticipantDialog";
import { deleteParticipant } from "@/server/actions/participants";

type Props = {
  participant: { id: string; name: string; role: string | null; company: string | null; segment: string | null; toolsUsed: string[]; notes: string | null };
  facets: { roles: string[]; companies: string[]; segments: string[]; tools: string[] };
  canDelete: boolean;
};

export function ParticipantActions({ participant, facets, canDelete }: Props) {
  const router = useRouter();
  return (
    <>
      <ParticipantDialog facets={facets} initial={participant} trigger={<Button variant="outline" size="sm"><Pencil className="size-4" /> Edit</Button>} />
      {canDelete ? (
        <ConfirmButton
          title={`Delete “${participant.name}”?`}
          description="Removes this participant's record and their links to sources. Transcripts and highlights are kept. Only admins can do this."
          onConfirm={async () => {
            const res = await deleteParticipant({ id: participant.id });
            if (res.ok) router.push("/participants");
            return res;
          }}
        >
          <Trash2 className="size-4" /> Delete
        </ConfirmButton>
      ) : null}
    </>
  );
}
