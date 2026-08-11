import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { seedMarketingMaster } from "./seed-marketing-master";

function createAdapter() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL belum ada di .env");
  }

  const url = new URL(databaseUrl);

  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace("/", ""),
    connectionLimit: 10,
    connectTimeout: 20_000,
    acquireTimeout: 20_000,
  });
}

const prisma = new PrismaClient({
  adapter: createAdapter(),
});

async function main() {
  console.log("Seeding master marketing saja (matriks, regulasi, durasi)...");
  await seedMarketingMaster(prisma);
  console.log("Seed master marketing selesai.");
}

main()
  .catch((error) => {
    console.error("Seed master marketing gagal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
