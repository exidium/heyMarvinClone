import { PageHeader } from "@/components/shell/PageHeader";

export const metadata = { title: "Tags" };

export default function TagsPage() {
  return (
    <>
      <PageHeader title="Tags" description="Global tag list: groups, rename, merge, archive." />
      <p className="p-6 text-sm text-muted-foreground">Tag management arrives in milestone 6.</p>
    </>
  );
}
