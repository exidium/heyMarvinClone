import "server-only";
import { hash, verify } from "@node-rs/argon2";

export const hashPassword = (password: string) => hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
export const verifyPassword = (hashed: string, password: string) => verify(hashed, password).catch(() => false);
