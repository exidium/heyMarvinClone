"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, FolderKanban, Search, Tags, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/participants", label: "Participants", icon: Users },
  { href: "/search", label: "Search", icon: Search },
] as const;

const admin = [{ href: "/tags", label: "Tags", icon: Tags }] as const;

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

export function AppSidebar({ userLabel = "Local mode", isAdmin = false }: { userLabel?: string; isAdmin?: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const renderLink = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4">
      <Link href="/projects" className="mb-6 flex items-center gap-2 px-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <BookOpenText className="size-4" />
        </span>
        <span className="text-base font-semibold tracking-tight">Research Repo</span>
      </Link>
      <nav className="flex flex-col gap-0.5">{nav.map(renderLink)}</nav>
      {isAdmin ? (
        <>
          <div className="mt-6 mb-2 px-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Admin</div>
          <nav className="flex flex-col gap-0.5">{admin.map(renderLink)}</nav>
        </>
      ) : null}
      <div className="mt-auto px-2.5 pb-10 text-xs text-muted-foreground">{userLabel}</div>
    </aside>
  );
}
