import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { searchHref, toFilters } from "@/lib/search-params";
import { getSavedView } from "@/server/queries/views";

/** A saved view is just a stored filter: send the user to /search with it applied. */
export default async function ViewPage({ params }: PageProps<"/views/[viewId]">) {
  const { viewId } = await params;
  const user = await requireUser();
  const view = await getSavedView(user, viewId);
  if (!view) notFound();
  const href = searchHref(toFilters(view.filters));
  redirect(`${href}${href.includes("?") ? "&" : "?"}view=${view.id}`);
}
