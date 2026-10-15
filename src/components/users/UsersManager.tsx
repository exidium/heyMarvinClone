"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmButton } from "@/components/shared/ConfirmButton";
import { formatDate } from "@/lib/format";
import { createUser, deleteUser, setAdmin, setPassword } from "@/server/actions/users";

type Row = { id: string; email: string; name: string | null; isAdmin: boolean; createdAt: Date; hasPassword: boolean; _count: { sessions: number; memberships: number } };

export function UsersManager({ users, meId }: { users: Row[]; meId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", password: "", isAdmin: false });
  const [pw, setPw] = useState<{ id: string; email: string; value: string } | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string) =>
    start(async () => { const r = await fn(); if (!r.ok) { toast.error(r.error ?? "Failed"); return; } if (ok) toast.success(ok); router.refresh(); });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}><Plus className="size-4" /> New user</DialogTrigger>
          <DialogContent>
            <form className="contents" onSubmit={(e) => { e.preventDefault(); run(() => createUser(form), "User created"); setOpen(false); setForm({ email: "", name: "", password: "", isAdmin: false }); }}>
              <DialogHeader><DialogTitle>New user</DialogTitle></DialogHeader>
              <div className="flex flex-col gap-3">
                <Field><FieldLabel htmlFor="u-email">Email</FieldLabel><Input id="u-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus /></Field>
                <Field><FieldLabel htmlFor="u-name">Name</FieldLabel><Input id="u-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field><FieldLabel htmlFor="u-pw">Initial password</FieldLabel><Input id="u-pw" type="text" required minLength={10} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 10 characters; share it privately" /></Field>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.isAdmin} onCheckedChange={(v) => setForm({ ...form, isAdmin: v === true })} /> Global admin (manages users, tags and deletions)</label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={pending}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Projects</TableHead><TableHead>Created</TableHead><TableHead /></TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell><div className="font-medium">{u.name ?? "—"}</div><div className="text-xs text-muted-foreground">{u.email}{!u.hasPassword ? " · no password set" : ""}</div></TableCell>
              <TableCell>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={u.isAdmin} disabled={u.id === meId || pending} onCheckedChange={(v) => run(() => setAdmin({ userId: u.id, isAdmin: v === true }))} /> Admin
                </label>
              </TableCell>
              <TableCell className="text-muted-foreground">{u._count.memberships}</TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
              <TableCell className="text-right">
                <span className="inline-flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setPw({ id: u.id, email: u.email, value: "" })}><KeyRound className="size-4" /> Password</Button>
                  {u.id !== meId ? (
                    <ConfirmButton title={`Delete ${u.email}?`} description="Their projects are reassigned to you; highlights they made are kept." variant="ghost" size="sm" onConfirm={() => deleteUser({ userId: u.id })}><Trash2 className="size-4" /></ConfirmButton>
                  ) : <Badge variant="outline">you</Badge>}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={!!pw} onOpenChange={(o) => { if (!o) setPw(null); }}>
        <DialogContent>
          {pw ? (
            <form className="contents" onSubmit={(e) => { e.preventDefault(); run(() => setPassword({ userId: pw.id, password: pw.value }), "Password set; their sessions were signed out"); setPw(null); }}>
              <DialogHeader><DialogTitle>Set a new password for {pw.email}</DialogTitle></DialogHeader>
              <Field><FieldLabel htmlFor="pw-new">New password</FieldLabel><Input id="pw-new" type="text" required minLength={10} autoFocus value={pw.value} onChange={(e) => setPw({ ...pw, value: e.target.value })} /></Field>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPw(null)}>Cancel</Button>
                <Button type="submit" disabled={pending}>Save</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
