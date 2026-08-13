import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL belum ada");

  const url = new URL(databaseUrl);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace("/", ""),
    connectionLimit: 1,
  });

  const prisma = new PrismaClient({ adapter });

  const customers = await prisma.customer.findMany({
    where: {
      email: {
        in: ['rafifn.a18@gmail.com', 'rafifnuraydin.kuliah@gmail.com', 'indobarbar21@gmail.com', 'rafifnurpro@gmail.com']
      }
    },
    select: {
      customerCode: true,
      customerType: true,
      company: true,
      email: true,
      consultant: {
        select: { code: true, company: true }
      }
    },
    orderBy: { customerCode: 'asc' }
  });

  console.log('--- Verifikasi Pelanggan UAT ---');
  console.log(`Total ditemukan: ${customers.length}\n`);
  customers.forEach(c => {
    const consInfo = c.consultant ? ` [Konsultan: ${c.consultant.code} ${c.consultant.company}]` : '';
    console.log(`${c.customerCode} | ${c.customerType} | ${c.company} | ${c.email}${consInfo}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
