import { PageHeader } from "@/components/shell/PageHeader";
import { ExplorerShell } from "@/components/explore/ExplorerShell";
import { requirePageUser } from "@/lib/auth";
import { parseKey, PIVOTS, type Pivot } from "@/lib/explore";
import { buildTree, getTheme, listHighlightsUnder, listThemes } from "@/server/queries/explore";
import { listProductAreas } from "@/server/queries/projects";
import { db } from "@/lib/db";
import { visibleProjectsWhere } from "@/lib/authz";

export const metadata = { title: "Explore" };

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const sp = await searchParams;
  const user = await requirePageUser();
  const pivot = (PIVOTS as readonly string[]).includes(String(sp.pivot)) ? (sp.pivot as Pivot) : "projects";
  const node = typeof sp.node === "string" ? sp.node : "";
  const h = typeof sp.h === "string" ? sp.h : null;
  const key = parseKey(node);

  const [tree, total, list, themes, theme, productAreas] = await Promise.all([
    buildTree(user, pivot),
    db.highlight.count({ where: { status: "ACTIVE", source: { project: visibleProjectsWhere(user) } } }),
    listHighlightsUnder(user, node),
    listThemes(),
    key.kind === "theme" && key.id ? getTheme(key.id) : null,
    listProductAreas(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="Explore" description="Browse every highlight by project, tag, person or theme. Drag highlights onto themes to build findings." className="py-3" />
      <ExplorerShell
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
