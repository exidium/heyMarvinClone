import type { ReactNode } from "react";
import { BookOpenText, Compass, FolderKanban, Search, Tags, Users } from "lucide-react";
import { href } from "./router";

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");

export function Link({ to, params, className, children, title }: { to: string; params?: Record<string, string | null | undefined>; className?: string; children: ReactNode; title?: string }) {
  return <a href={href(to, params)} className={className} title={title}>{children}</a>;
}

export function TagChip({ name, color }: { name: string; color: string }) {
  return <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs"><span className="size-2 shrink-0 rounded-full" style={{ background: color }} />{name}</span>;
}

export function PageHeader({ title, description, children }: { title: ReactNode; description?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 border-b px-6 py-4">
      <div className="min-w-0"><h1 className="text-xl font-semibold tracking-tight">{title}</h1>{description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}</div>
      {children}
    </header>
  );
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr>{head.map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  );
}

const nav = [
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/participants", label: "Participants", icon: Users },
  { to: "/search", label: "Search", icon: Search },
  { to: "/tags", label: "Tags", icon: Tags },
];

export function Sidebar({ current }: { current: string }) {
  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4">
      <a href={href("/explore")} className="mb-6 flex items-center gap-2 px-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"><BookOpenText className="size-4" /></span>
        <span className="text-base font-semibold tracking-tight">Research Repo</span>
      </a>
      <nav className="flex flex-col gap-0.5">
        {nav.map((n) => {
          const active = current === n.to || current.startsWith(n.to + "/");
          const Icon = n.icon;
          return (
            <a key={n.to} href={href(n.to)} aria-current={active ? "page" : undefined} className={cx("flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors", active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")}>
              <Icon className="size-4 shrink-0" /><span className="truncate">{n.label}</span>
            </a>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-1 px-2.5 pb-6 text-xs text-muted-foreground">
        <span>Read-only demo</span>
        <span>Synthetic data, no real research</span>
        <a className="hover:text-foreground" href="https://github.com/exidium/researchRepo">Source on GitHub</a>
      </div>
    </aside>
  );
}
