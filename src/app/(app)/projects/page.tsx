import { PageHeader } from "@/components/shell/PageHeader";

export default function ProjectsPage() {
  return (
    <>
      <PageHeader title="Projects" description="Studies, their sources and participants." />
      <div className="p-6 text-sm text-muted-foreground">No projects yet.</div>
    </>
  );
}
