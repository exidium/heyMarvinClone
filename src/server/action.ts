import type { z } from "zod";
import type { Project, ProjectRole, User } from "@/generated/prisma/client";
import { AuthError, requireUser } from "@/lib/auth";
import { AuthzError, requireProjectRole } from "@/lib/authz";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
export type ActionCtx = { user: User };
export type ProjectCtx = ActionCtx & { project: Project; role: ProjectRole };

function fail(e: unknown): ActionResult<never> {
  if (e instanceof AuthError || e instanceof AuthzError) return { ok: false, error: e.message };
  console.error(e);
  return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
}

function parse<S extends z.ZodType>(schema: S, raw: unknown) {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new AuthzError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "));
  }
  return parsed.data as z.output<S>;
}

/**
 * A mutation that only needs a signed-in user (projects list, participants, saved views).
 * Validates input with zod, never throws to the client.
 */
export function authedAction<S extends z.ZodType, R>(
  schema: S,
  handler: (input: z.output<S>, ctx: ActionCtx) => Promise<R>,
) {
  return async (raw: z.input<S>): Promise<ActionResult<R>> => {
    try {
      const user = await requireUser();
      const data = await handler(parse(schema, raw), { user });
      return { ok: true, data };
    } catch (e) {
      return fail(e);
    }
  };
}

/**
 * A mutation scoped to one project. `projectIdOf` finds the project from the input
 * (directly, or via a source/highlight/segment lookup); `min` is the role required.
 * This is the single role-enforcement seam for every project-level mutation.
 */
export function projectAction<S extends z.ZodType, R>(
  schema: S,
  min: ProjectRole,
  projectIdOf: (input: z.output<S>) => string | Promise<string>,
  handler: (input: z.output<S>, ctx: ProjectCtx) => Promise<R>,
) {
  return async (raw: z.input<S>): Promise<ActionResult<R>> => {
    try {
      const input = parse(schema, raw);
      const projectId = await projectIdOf(input);
      const ctx = await requireProjectRole(projectId, min);
      const data = await handler(input, ctx);
      return { ok: true, data };
    } catch (e) {
      return fail(e);
    }
  };
}
