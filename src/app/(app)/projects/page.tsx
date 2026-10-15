import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import { requireUser } from "@/lib/auth";
import { countHighlightsByProject, listProductAreas, listProjects } from "@/server/queries/projects";

export const metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const { archived } = await searchParams;
  const user = await requireUser();
  const includeArchived = archived === "1";
  const [projects, productAreas] = await Promise.all([listProjects(user, { includeArchived }), listProductAreas()]);
  const highlights = await countHighlightsByProject(projects.map((p) => p.id));
  const rows = projects.map((p) => ({ ...p, highlights: highlights.get(p.id) ?? 0 }));
  const newButton = <ProjectDialog productAreas={productAreas} trigger={<Button size="sm"><Plus className="size-4" /> New project</Button>} />;

  return (
    <>
      <PageHeader
        title="Projects"
        description="Studies, their sources and participants."
        actions={
          <>
            <Button variant="ghost" size="sm" render={<a href={includeArchived ? "/projects" : "/projects?archived=1"} />}>
              {includeArchived ? "Hide archived" : "Show archived"}
            </Button>
            {newButton}
          </>
        }
      />
      <div className="p-6">
        {rows.length ? <ProjectsTable rows={rows} /> : <EmptyState title="No projects yet" hint="Create a project for a study, then upload its transcripts." action={newButton} />}
      </div>
    </>
  );
}
