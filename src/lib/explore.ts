/**
 * The explorer shows the same highlights under several trees ("pivots"). A node is addressed by a
 * compact key that lives in the URL, e.g. `project:cm123` or `speaker:cm123:Dana Carr`.
 */
export const PIVOTS = ["projects", "tags", "people", "themes"] as const;
export type Pivot = (typeof PIVOTS)[number];
export const PIVOT_LABEL: Record<Pivot, string> = { projects: "Projects", tags: "Tags", people: "People", themes: "Themes" };

export type NodeKind =
  | "root" | "area" | "project" | "source" | "speaker"
  | "group" | "tag" | "untagged"
  | "segment" | "company" | "participant" | "noparticipant"
  | "theme" | "unthemed";

export type NodeKey = { kind: NodeKind; id?: string; extra?: string };

export type TreeNode = {
  key: string;
  label: string;
  count: number;
  children?: TreeNode[];
  meta?: Record<string, string | null>;
};

export function formatKey(k: NodeKey): string {
  if (k.kind === "root") return "";
  return [k.kind, k.id, k.extra].filter((x) => x !== undefined).join(":");
}

export function parseKey(raw: string | null | undefined): NodeKey {
  if (!raw) return { kind: "root" };
  const i = raw.indexOf(":");
  if (i === -1) return { kind: raw as NodeKind };
  const kind = raw.slice(0, i) as NodeKind;
  const rest = raw.slice(i + 1);
  if (kind === "speaker") {
    const j = rest.indexOf(":");
    return j === -1 ? { kind, id: rest } : { kind, id: rest.slice(0, j), extra: rest.slice(j + 1) };
  }
  return { kind, id: rest };
}

/** The pivot a node belongs to (root belongs to all). */
export function pivotOfKind(kind: NodeKind): Pivot | null {
  switch (kind) {
    case "area": case "project": case "source": case "speaker": return "projects";
    case "group": case "tag": case "untagged": return "tags";
    case "segment": case "company": case "participant": case "noparticipant": return "people";
    case "theme": case "unthemed": return "themes";
    default: return null;
  }
}

/** Keys on the path from the root to `key`, so the tree can expand it. */
export function findPath(nodes: TreeNode[], key: string, acc: string[] = []): string[] | null {
  for (const n of nodes) {
    if (n.key === key) return [...acc, n.key];
    if (n.children) {
      const p = findPath(n.children, key, [...acc, n.key]);
      if (p) return p;
    }
  }
  return null;
}

export function findNode(nodes: TreeNode[], key: string): TreeNode | null {
  for (const n of nodes) {
    if (n.key === key) return n;
    if (n.children) { const f = findNode(n.children, key); if (f) return f; }
  }
  return null;
}

export const NONE = "—";
