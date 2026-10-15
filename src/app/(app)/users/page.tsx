import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { UsersManager } from "@/components/users/UsersManager";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/auth";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requirePageUser();
  if (!me.isAdmin) notFound();
  const users = await db.user.findMany({
    orderBy: [{ isAdmin: "desc" }, { email: "asc" }],
    select: { id: true, email: true, name: true, isAdmin: true, createdAt: true, passwordHash: true, _count: { select: { sessions: true, memberships: true } } },
  });
  return (
    <>
      <PageHeader title="Users" description="Accounts for colleagues. Project roles are set on each project." />
      <div className="p-6">
        <UsersManager meId={me.id} users={users.map(({ passwordHash, ...u }) => ({ ...u, hasPassword: !!passwordHash }))} />
      </div>
    </>
  );
}
