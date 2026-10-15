"use client";

import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/shared/ConfirmButton";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { deleteProject, setProjectArchived } from "@/server/actions/projects";

type Props = {
  project: { id: string; name: string; goal: string | null; productArea: string | null; startDate: Date | null; endDate: Date | null; access: "OPEN" | "RESTRICTED"; archivedAt: Date | null };
  productAreas: string[];
  canDelete: boolean;
};

export function ProjectActions({ project, productAreas, canDelete }: Props) {
  const router = useRouter();
  const archived = !!project.archivedAt;
  return (
    <>
      <ProjectDialog productAreas={productAreas} initial={project} trigger={<Button variant="outline" size="sm"><Pencil className="size-4" /> Edit</Button>} />
      <Button
        variant="outline" size="sm"
        onClick={async () => {
          const res = await setProjectArchived({ id: project.id, archived: !archived });
          if (!res.ok) toast.error(res.error); else { toast.success(archived ? "Project restored" : "Project archived"); router.refresh(); }
        }}
      >
        {archived ? <><ArchiveRestore className="size-4" /> Restore</> : <><Archive className="size-4" /> Archive</>}
      </Button>
      {canDelete ? (
        <ConfirmButton
          title={`Delete “${project.name}”?`}
          description="This removes the project, all its sources, transcripts and highlights. This cannot be undone."
          onConfirm={async () => {
            const res = await deleteProject({ id: project.id });
            if (res.ok) router.push("/projects");
            return res;
          }}
        >
          <Trash2 className="size-4" /> Delete
        </ConfirmButton>
      ) : null}
    </>
  );
}
