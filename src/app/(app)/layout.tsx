import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { getCurrentUser } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar userLabel={`${user.name ?? user.email}${user.isAdmin ? " · admin" : ""}`} isAdmin={user.isAdmin} />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
