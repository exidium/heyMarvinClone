import { z } from "zod";
import { idSchema } from "./common";

// Login takes any non-empty identifier (dev users are "name@local"); the database lookup decides.
export const LoginSchema = z.object({ email: z.string().trim().min(1).max(200), password: z.string().min(1) });
export const CreateUserSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(10, "Use at least 10 characters").max(200),
  isAdmin: z.boolean().default(false),
});
export const SetPasswordSchema = z.object({ userId: idSchema, password: z.string().min(10, "Use at least 10 characters").max(200) });
export const SetAdminSchema = z.object({ userId: idSchema, isAdmin: z.boolean() });
export const DeleteUserSchema = z.object({ userId: idSchema });
