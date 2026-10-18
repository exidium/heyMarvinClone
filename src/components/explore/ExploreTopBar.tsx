"use client";

import { useState, useTransition } from "react";
import { useQueryStates } from "nuqs";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { exploreParsers } from "@/components/explore/explore-params";

/** Header row of the explorer: title and a keyword search that narrows the tree and the list. */
export function ExploreTopBar() {
  const [params, setParams] = useQueryStates(exploreParsers, { shallow: false, history: "push" });
  const [q, setQ] = useState(params.q);
  const [, start] = useTransition();
  const apply = (value: string) => start(() => { void setParams({ q: value || null, h: null }); });

  return (
    <header className="flex h-13 shrink-0 items-center gap-4 border-b px-4">
      <div className="shrink-0">
        <h1 className="text-base font-semibold tracking-tight">Explore</h1>
      </div>
      <form className="relative mx-auto w-full max-w-xl" onSubmit={(e) => { e.preventDefault(); apply(q); }} role="search">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder='Search highlights… quotes for a phrase, -word to exclude' className="pr-8 pl-8" aria-label="Search highlights" />
        {params.q ? (
          <button type="button" aria-label="Clear search" className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => { setQ(""); apply(""); }}><X className="size-4" /></button>
        ) : null}
      </form>
      <p className="hidden shrink-0 text-xs text-muted-foreground lg:block">Browse by project, tag, person or theme · drag highlights onto themes</p>
    </header>
  );
}
