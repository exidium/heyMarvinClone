"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/session";
import { LoginSchema } from "@/lib/validation/auth";

export type LoginState = { error?: string; email?: string };

/** Form action for the login page (useActionState). Generic error so emails cannot be probed. */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: "Enter your email and password.", email };
  const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  const ok = user?.passwordHash ? await verifyPassword(user.passwordHash, parsed.data.password) : false;
  if (!user || !ok) return { error: "Wrong email or password.", email };
  await createSession(user.id);
  redirect("/projects");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
