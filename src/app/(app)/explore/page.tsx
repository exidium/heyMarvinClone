import { Suspense } from "react";
import { ExplorerShell } from "@/components/explore/ExplorerShell";
import { ExploreTopBar } from "@/components/explore/ExploreTopBar";
import { requirePageUser } from "@/lib/auth";
import { parseKey, PIVOTS, type Pivot } from "@/lib/explore";
import { buildTree, countVisible, getTheme, listHighlightsUnder, listThemes } from "@/server/queries/explore";
import { listProductAreas } from "@/server/queries/projects";

export const metadata = { title: "Explore" };

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const sp = await searchParams;
  const user = await requirePageUser();
  const pivot = (PIVOTS as readonly string[]).includes(String(sp.pivot)) ? (sp.pivot as Pivot) : "projects";
  const node = typeof sp.node === "string" ? sp.node : "";
  const h = typeof sp.h === "string" ? sp.h : null;
  const q = typeof sp.q === "string" ? sp.q : "";
  const key = parseKey(node);

  const [tree, total, list, themes, theme, productAreas] = await Promise.all([
    buildTree(user, pivot, q),
    countVisible(user, q),
    listHighlightsUnder(user, node, q),
    listThemes(),
    key.kind === "theme" && key.id ? getTheme(key.id) : null,
    listProductAreas(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<div className="h-13 border-b" />}>
        <ExploreTopBar />
      </Suspense>
      <ExplorerShell
        q={q}
        pivot={pivot}
        node={node}
        tree={tree}
        total={total}
        rows={list.rows}
        listTotal={list.total}
        themes={themes}
        theme={theme}
        productAreas={productAreas}
        userId={user.id}
        isAdmin={user.isAdmin}
        initialHighlightId={h}
      />
    </div>
  );
}
