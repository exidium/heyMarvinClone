import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

export const DEV_USERS = [
  { email: "admin@local", name: "Dev Admin", isAdmin: true },
  { email: "editor@local", name: "Dev Editor", isAdmin: false },
  { email: "viewer@local", name: "Dev Viewer", isAdmin: false },
];

async function main() {
  for (const u of DEV_USERS) {
    await db.user.upsert({ where: { email: u.email }, update: { name: u.name, isAdmin: u.isAdmin }, create: u });
  }
  console.log(`seeded ${DEV_USERS.length} dev users`);
  // The synthetic mirror import is added in milestone 2.
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
