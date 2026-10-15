import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
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
  // Session-based lookup is added in the auth milestone.
  return null;
});

/** Returns the current user or throws AuthError. Layouts redirect on it; actions return {ok:false}. */
export const requireUser = cache(async (): Promise<User> => {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
});
