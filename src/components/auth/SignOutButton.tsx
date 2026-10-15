"use client";

import { LogOut } from "lucide-react";
import { logout } from "@/server/actions/auth";

export function SignOutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><LogOut className="size-3.5" /> Sign out</button>
    </form>
  );
}
