import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { getCurrentUser, isDevAuth } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { listSavedViews } from "@/server/queries/views";

// Every page in the shell depends on the signed-in user and the database: never prerender at build time.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const views = await listSavedViews(user);
  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar userLabel={`${user.name ?? user.email}${user.isAdmin ? " · admin" : ""}`} isAdmin={user.isAdmin} views={views.map((v) => ({ id: v.id, name: v.name, isShared: v.isShared }))} footer={isDevAuth() ? <span>dev seam · AUTH_DISABLED</span> : <SignOutButton />} />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
