"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addMember, removeMember, updateMember } from "@/server/actions/projects";

type Role = "ADMIN" | "EDITOR" | "VIEWER";
type Member = { userId: string; role: Role; user: { id: string; name: string | null; email: string } };
const ROLE_LABEL: Record<Role, string> = { ADMIN: "Admin", EDITOR: "Editor", VIEWER: "Viewer" };

function RoleSelect({ value, onChange, id }: { value: Role; onChange: (r: Role) => void; id?: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange((v as Role) ?? "VIEWER")}>
      <SelectTrigger id={id} size="sm" className="min-w-24"><SelectValue>{(v: string) => ROLE_LABEL[v as Role] ?? "Role"}</SelectValue></SelectTrigger>
      <SelectContent>
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/** Named members with per-project roles. Shown to project admins; required for RESTRICTED projects. */
export function MembersPanel({ projectId, members, canManage, ownerEmail }: { projectId: string; members: Member[]; canManage: boolean; ownerEmail: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) { toast.error(res.error ?? "Failed"); return; }
      done?.();
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-y rounded-md border text-sm">
        <li className="flex items-center justify-between gap-3 px-3 py-2">
          <span className="truncate">{ownerEmail}</span>
          <span className="text-xs text-muted-foreground">Owner · Admin</span>
        </li>
        {members.map((m) => (
          <li key={m.userId} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0 truncate">{m.user.name ?? m.user.email}<span className="ml-2 text-xs text-muted-foreground">{m.user.email}</span></span>
            {canManage ? (
              <span className="flex items-center gap-1">
                <RoleSelect value={m.role} onChange={(r) => run(() => updateMember({ projectId, userId: m.userId, role: r }))} />
                <Button variant="ghost" size="icon-sm" aria-label="Remove member" onClick={() => run(() => removeMember({ projectId, userId: m.userId }))}><X className="size-4" /></Button>
              </span>
            ) : <span className="text-xs text-muted-foreground">{ROLE_LABEL[m.role]}</span>}
          </li>
        ))}
        {!members.length ? <li className="px-3 py-2 text-xs text-muted-foreground">No named members yet.</li> : null}
      </ul>
      {canManage ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); run(() => addMember({ projectId, email, role }), () => setEmail("")); }}
        >
          <Input type="email" placeholder="colleague@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="max-w-xs" aria-label="Member email" />
          <RoleSelect value={role} onChange={setRole} />
          <Button type="submit" size="sm" variant="outline" disabled={pending || !email}>Add</Button>
        </form>
      ) : null}
    </div>
  );
}
