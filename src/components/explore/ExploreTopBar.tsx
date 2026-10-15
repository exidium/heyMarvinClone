"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { BookOpenText, Database, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { exploreParsers } from "@/components/explore/explore-params";

/** Brand, keyword search that narrows the tree and the list, and a way back into the repository. */
export function ExploreTopBar({ userLabel, devAuth }: { userLabel: string; devAuth: boolean }) {
  const [params, setParams] = useQueryStates(exploreParsers, { shallow: false, history: "push" });
  const [q, setQ] = useState(params.q);
  const [, start] = useTransition();
  const apply = (value: string) => start(() => { void setParams({ q: value || null, h: null }); });

  return (
    <header className="flex h-13 items-center gap-4 border-b px-4">
      <Link href="/explore" className="flex shrink-0 items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"><BookOpenText className="size-4" /></span>
        <span className="font-semibold tracking-tight">Research Repo</span>
        <span className="hidden text-sm text-muted-foreground sm:inline">· Explore</span>
      </Link>
      <form className="relative mx-auto w-full max-w-xl" onSubmit={(e) => { e.preventDefault(); apply(q); }} role="search">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder='Search highlights… quotes for a phrase, -word to exclude' className="pr-8 pl-8" aria-label="Search highlights" />
        {params.q ? (
          <button type="button" aria-label="Clear search" className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => { setQ(""); apply(""); }}><X className="size-4" /></button>
        ) : null}
      </form>
      <nav className="flex shrink-0 items-center gap-3 text-sm">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/projects" />}><Database className="size-4" /> Repository</Button>
        <span className="hidden max-w-40 truncate text-xs text-muted-foreground md:inline">{userLabel}</span>
        {devAuth ? null : <SignOutButton />}
      </nav>
    </header>
  );
}
