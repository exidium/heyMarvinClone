import { redirect } from "next/navigation";
import { BookOpenText } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/projects");
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground"><BookOpenText className="size-4" /></span>
          <div>
            <h1 className="text-base font-semibold">Research Repo</h1>
            <p className="text-xs text-muted-foreground">Sign in with the account an admin created for you.</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
