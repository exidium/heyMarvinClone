import { tagColorOf, type Index } from "../data";
import { Link, PageHeader } from "../ui";

export function TagsPage({ ix }: { ix: Index }) {
  const counts = new Map<string, number>();
  for (const h of ix.data.highlights) for (const t of h.tags) counts.set(t.tagId, (counts.get(t.tagId) ?? 0) + 1);
  const sections: { id: string | null; name: string }[] = [...ix.data.groups.map((g) => ({ id: g.id as string | null, name: g.name })), { id: null, name: "Ungrouped" }];
  return (
    <>
      <PageHeader title="Tags" description="Global tag list by group with usage counts. Renaming, merging and archiving live in the full app." />
      <div className="flex flex-col gap-4 p-6">
        {sections.map((g) => {
          const tags = ix.data.tags.filter((t) => (t.groupId ?? null) === g.id).sort((a, b) => a.name.localeCompare(b.name));
          if (!tags.length) return null;
          return (
            <section key={g.id ?? "none"} className="rounded-lg border">
              <header className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-sm font-medium"><span className="size-2.5 rounded-full" style={{ background: tagColorOf(ix, tags[0].id) }} />{g.name}<span className="text-xs text-muted-foreground">{tags.length}</span></header>
              <ul className="divide-y">
                {tags.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: tagColorOf(ix, t.id) }} />
                    <Link to="/explore" params={{ pivot: "tags", node: `tag:${t.id}` }} className="hover:underline">{t.name}</Link>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">{counts.get(t.id) ?? 0} highlights</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
