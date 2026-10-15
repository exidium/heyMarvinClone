import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readSessionUser } from "@/lib/session";
import type { User } from "@/generated/prisma/client";

/**
 * The single auth seam. Until the login milestone, AUTH_DISABLED=true resolves one of the
 * seeded dev users (DEV_USER=admin|editor|viewer). The seam refuses to run in production.
 * When sessions exist, only this file changes: getCurrentUser() reads the session cookie.
 */
export const DEV_USERS = {
  admin: "admin@local",
  editor: "editor@local",
  viewer: "viewer@local",
} as const;

export type DevUserKey = keyof typeof DEV_USERS;

/** True when the dev seam is active (no real sessions, no sign-out). */
export const isDevAuth = () => process.env.AUTH_DISABLED === "true" && process.env.NODE_ENV !== "production";

export class AuthError extends Error {
  constructor(message = "Not signed in") {
    super(message);
    this.name = "AuthError";
  }
}

function devUserEmail(): string | null {
  if (process.env.AUTH_DISABLED !== "true") return null;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_DISABLED is not allowed in production builds.");
  }
  const key = (process.env.DEV_USER ?? "admin") as DevUserKey;
  return DEV_USERS[key] ?? DEV_USERS.admin;
}

/** Returns the current user or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const email = devUserEmail();
  if (email) return db.user.findUnique({ where: { email } });
  return readSessionUser();
});

/** For pages: the current user, or a redirect to /login. Pages render in parallel with layouts, so each page guards itself. */
export const requirePageUser = cache(async (): Promise<User> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});

/** For actions and route handlers: the current user or an AuthError (actions turn it into {ok:false}, routes into 401). */
export const requireUser = cache(async (): Promise<User> => {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
});
