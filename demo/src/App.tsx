import { useEffect, useMemo, useState } from "react";
import { buildIndex, type Data } from "./data";
import { useRoute } from "./router";
import { Sidebar } from "./ui";
import { ExplorePage } from "./pages/Explore";
import { ProjectsPage } from "./pages/Projects";
import { ProjectPage } from "./pages/Project";
import { SourcePage } from "./pages/Source";
import { ParticipantPage, ParticipantsPage } from "./pages/Participants";
import { TagsPage } from "./pages/Tags";
import { SearchPage } from "./pages/SearchPage";

/** Read-only static copy of the research repository, on synthetic data. Routing by URL hash. */
export function App() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const route = useRoute();

  useEffect(() => {
    // Old explorer links used query params on the root; move them into the hash.
    if (!location.hash && location.search) { history.replaceState(null, "", `${location.pathname}#/explore${location.search}`); window.dispatchEvent(new HashChangeEvent("hashchange")); }
    fetch(`${import.meta.env.BASE_URL}data.json`).then((r) => r.json()).then(setData).catch((e) => setError(String(e)));
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [route.path]);

  const ix = useMemo(() => (data ? buildIndex(data) : null), [data]);
  if (error) return <p className="p-6 text-sm text-destructive">Could not load data.json: {error}</p>;
  if (!ix) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;

  const [a, b, c, d] = route.parts;
  if (a === "explore" || !a) return <ExplorePage ix={ix} params={route.params} />;

  let page: React.ReactNode;
  if (a === "projects" && !b) page = <ProjectsPage ix={ix} />;
  else if (a === "projects" && b && c === "sources" && d) page = <SourcePage ix={ix} projectId={b} sourceId={d} params={route.params} />;
  else if (a === "projects" && b) page = <ProjectPage ix={ix} id={b} />;
  else if (a === "participants" && b) page = <ParticipantPage ix={ix} id={b} />;
  else if (a === "participants") page = <ParticipantsPage ix={ix} />;
  else if (a === "tags") page = <TagsPage ix={ix} />;
  else if (a === "search") page = <SearchPage ix={ix} params={route.params} />;
  else page = <p className="p-6 text-sm text-muted-foreground">Page not found.</p>;

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar current={route.path} />
      <main className="flex min-w-0 flex-1 flex-col">{page}</main>
    </div>
  );
}
