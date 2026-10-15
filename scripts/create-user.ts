/**
 * Create or update a user from the shell (first admin on a fresh deployment).
 *   pnpm tsx scripts/create-user.ts admin@company.com "Full Name" --admin
 * Prompts for the password (or reads USER_PASSWORD from the environment).
 */
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const [email, name, ...flags] = process.argv.slice(2);
if (!email || !name) { console.error('usage: create-user.ts <email> "<name>" [--admin]'); process.exit(2); }
const isAdmin = flags.includes("--admin");

async function main() {
  let password = process.env.USER_PASSWORD;
  if (!password) {
    const rl = createInterface({ input: stdin, output: stdout });
    password = await rl.question(`Password for ${email}: `);
    rl.close();
  }
  if (!password || password.length < 10) throw new Error("Password must be at least 10 characters");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const user = await db.user.upsert({
    where: { email: email.toLowerCase() },
    update: { name, passwordHash, ...(isAdmin ? { isAdmin: true } : {}) },
    create: { email: email.toLowerCase(), name, passwordHash, isAdmin },
  });
  console.log(`${user.email} ready (${user.isAdmin ? "admin" : "user"})`);
  await db.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
