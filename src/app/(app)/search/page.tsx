import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchFilterBar } from "@/components/search/SearchFilterBar";
import { SaveViewDialog } from "@/components/search/SaveViewDialog";
import { DeleteViewButton } from "@/components/search/DeleteViewButton";
import { Snippet } from "@/components/search/snippet";
import { requireUser } from "@/lib/auth";
import { formatDate, plural } from "@/lib/format";
import { formatClock } from "@/lib/transcript/time";
import { tagColor } from "@/lib/colors";
import { loadSearchFilters, searchHref, toFilters } from "@/lib/search-params";
import { hasAnyFilter } from "@/lib/validation/search";
import { searchFacets } from "@/server/queries/facets";
import { PAGE_SIZE, searchHighlights, searchSegments } from "@/server/queries/search";
import { getSavedView } from "@/server/queries/views";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const user = await requireUser();
  const filters = toFilters(await loadSearchFilters(sp));
  const viewId = typeof sp.view === "string" ? sp.view : null;
  const [facets, view] = await Promise.all([searchFacets(user), viewId ? getSavedView(user, viewId) : null]);
  const run = hasAnyFilter(filters);
  const result = !run ? null : filters.scope === "highlights" ? await searchHighlights(user, filters) : await searchSegments(user, filters);
  const pages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;
  const pageHref = (p: number) => searchHref({ ...filters, page: p }) + (viewId ? `&view=${viewId}` : "");

  return (
    <>
      <PageHeader
        title={view ? view.name : "Search"}
        description={view ? "Saved view" : "Find evidence across every project you can access."}
        actions={run ? <>{view && (view.ownerId === user.id || user.isAdmin) ? <DeleteViewButton id={view.id} name={view.name} /> : null}<SaveViewDialog filters={filters} /></> : null}
      >
        <Suspense fallback={null}>
          <SearchFilterBar facets={facets} />
        </Suspense>
      </PageHeader>
      <div className="flex flex-col gap-4 p-6">
        {!run ? (
          <EmptyState title="Type a keyword or pick a filter" hint="Search covers highlight text and transcript lines in every project you can see. Results link to the exact moment in the source." />
        ) : !result || result.total === 0 ? (
          <EmptyState title="No results" hint="Try fewer filters, or switch between highlights and transcript lines." />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{plural(result.total, filters.scope === "highlights" ? "highlight" : "line")}{pages > 1 ? ` · page ${filters.page} of ${pages}` : ""}</p>
            <ol className="flex flex-col gap-3">
              {filters.scope === "highlights" && "tags" in (result.hits[0] ?? {})
                ? (result.hits as Awaited<ReturnType<typeof searchHighlights>>["hits"]).map((h) => (
                    <li key={h.id} className="rounded-lg border p-3 text-sm">
                      <Link href={`/projects/${h.projectId}/sources/${h.sourceId}?highlight=${h.id}`} className="block">
                        <blockquote className="whitespace-pre-line leading-relaxed"><Snippet text={h.snippet} /></blockquote>
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {h.tags.map((t) => <Badge key={t.id} variant="outline" className="gap-1"><span className="size-2 rounded-full" style={{ background: tagColor(t) }} />{t.name}</Badge>)}
                        {h.status === "ORPHANED" ? <Badge variant="outline">orphaned</Badge> : null}
                        <span>{h.participants ?? "No participant"}</span>
                        <Link href={`/projects/${h.projectId}`} className="hover:underline">{h.projectName}</Link>
                        <Link href={`/projects/${h.projectId}/sources/${h.sourceId}?highlight=${h.id}`} className="hover:underline">{h.sourceTitle}{h.startMs != null ? ` · ${formatClock(h.startMs)}` : ""}</Link>
                        {h.sourceDate ? <span>{formatDate(h.sourceDate)}</span> : null}
                        {h.productArea ? <span>{h.productArea}</span> : null}
                      </div>
                    </li>
                  ))
                : (result.hits as Awaited<ReturnType<typeof searchSegments>>["hits"]).map((g) => (
                    <li key={g.id} className="rounded-lg border p-3 text-sm">
                      <Link href={`/projects/${g.projectId}/sources/${g.sourceId}?segment=${g.id}`} className="block">
                        <span className="mr-2 text-xs font-medium">{g.speaker ?? ""}</span>
                        <span className="mr-2 text-xs tabular-nums text-muted-foreground">{g.startMs != null ? formatClock(g.startMs) : ""}</span>
                        <span className="leading-relaxed"><Snippet text={g.snippet} /></span>
                      </Link>
                      <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        <Link href={`/projects/${g.projectId}`} className="hover:underline">{g.projectName}</Link>
                        <span>{g.sourceTitle}</span>
                        {g.sourceDate ? <span>{formatDate(g.sourceDate)}</span> : null}
                      </div>
                    </li>
                  ))}
            </ol>
            {pages > 1 ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" nativeButton={false} disabled={filters.page <= 1} render={<Link href={pageHref(filters.page - 1)} />}>Previous</Button>
                <Button variant="outline" size="sm" nativeButton={false} disabled={filters.page >= pages} render={<Link href={pageHref(filters.page + 1)} />}>Next</Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
