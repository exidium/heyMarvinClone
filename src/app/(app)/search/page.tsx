import { PageHeader } from "@/components/shell/PageHeader";

export const metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <>
      <PageHeader title="Search" description="Keyword search across transcripts and highlights, with filters." />
      <p className="p-6 text-sm text-muted-foreground">Search arrives in milestone 7.</p>
    </>
  );
}
