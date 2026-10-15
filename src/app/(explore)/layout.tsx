import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ExploreTopBar } from "@/components/explore/ExploreTopBar";
import { getCurrentUser, isDevAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** The explorer is the stakeholder-facing surface: its own top bar, no repository sidebar (decision D49). */
export default async function ExploreLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<div className="h-13 border-b" />}>
        <ExploreTopBar userLabel={user.name ?? user.email} devAuth={isDevAuth()} />
      </Suspense>
      {children}
    </div>
  );
}
