import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { generateDocumentNo } from "../src/lib/document-number";

/**
 * Seed tambahan (terpisah dari seed.ts) khusus untuk demo alur lab & COA ke
 * Mas Nurdin. Idempoten: aman dijalankan berulang kali, sample lama dengan
 * sampleNo yang sama akan dihapus & dibuat ulang.
 */

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
    connectTimeout: 20000,
    acquireTimeout: 20000,
  });
}

const prisma = new PrismaClient({
  adapter: createAdapter(),
});

const SAMPLE_NO_RECEIVED = "SPL-DEMO-RECEIVED";
const SAMPLE_NO_FINAL_COA = "SPL-DEMO-FINALCOA";

const DEMO_RESULTS: Record<string, string> = {
  "Sulfur Dioksida (SO2)": "42.5",
  "Karbon Monoksida (CO)": "3150",
  "Nitrogen Dioksida (NO2)": "58.1",
  "Ozon (O3)": "61.4",
  TSP: "118",
  PM10: "36.2",
  "PM2.5": "11.8",
  "Timbal (Pb)": "0.72",
};

async function resetDemoSample(sampleNo: string) {
  const existing = await prisma.sample.findUnique({ where: { sampleNo } });

  if (!existing) return;

  await prisma.workflowLog.deleteMany({ where: { sampleId: existing.id } });
  await prisma.coa.deleteMany({ where: { sampleId: existing.id } });
  await prisma.sampleParameter.deleteMany({ where: { sampleId: existing.id } });
  await prisma.sample.delete({ where: { id: existing.id } });
}

async function main() {
  const customer = await prisma.customer.findFirstOrThrow({
    where: { email: "customer@medialab.test" },
  });

  const template = await prisma.coaTemplate.findUniqueOrThrow({
    where: { code: "AIR_AMBIENT" },
  });

  const templateParameters = await prisma.coaTemplateParameter.findMany({
    where: { templateId: template.id },
    include: { parameter: true },
    orderBy: { sort: "asc" },
  });

  if (templateParameters.length === 0) {
    throw new Error(
      "Template AIR_AMBIENT belum punya parameter. Jalankan `pnpm db:seed` dulu."
    );
  }

  const labAdmin = await prisma.user.findFirstOrThrow({
    where: { email: "labadmin@medialab.test" },
  });
  const supervisor = await prisma.user.findFirstOrThrow({
    where: { email: "supervisor@medialab.test" },
  });
  const analyst = await prisma.user.findFirstOrThrow({
    where: { email: "analyst@medialab.test" },
  });
  const labManager = await prisma.user.findFirstOrThrow({
    where: { email: "labmanager@medialab.test" },
  });

  await resetDemoSample(SAMPLE_NO_RECEIVED);
  await resetDemoSample(SAMPLE_NO_FINAL_COA);

  console.log("Membuat sample demo #1: baru RECEIVED...");

  const receivedAt = new Date();
  const sentAt = new Date(receivedAt.getTime() - 60 * 60 * 1000);

  const sampleReceived = await prisma.sample.create({
    data: {
      sampleNo: SAMPLE_NO_RECEIVED,
      customerId: customer.id,
      coaTemplateId: template.id,
      status: "RECEIVED",
      sentByCustomerAt: sentAt,
      receivedAt,
      receivedById: labAdmin.id,
      parameters: {
        create: templateParameters.map((tp) => ({
          parameterId: tp.parameterId,
          templateParameterId: tp.id,
          status: "WAITING",
          displayNameSnapshot: tp.displayName,
          unitSnapshot: tp.unit,
          methodSnapshot: tp.method,
          standardSnapshot: tp.standard,
          limitSnapshot: tp.limitValue,
        })),
      },
    },
  });

  await prisma.workflowLog.create({
    data: {
      actorId: labAdmin.id,
      sampleId: sampleReceived.id,
      action: "RECEIVE_SAMPLE",
      note: `Sample ${sampleReceived.sampleNo} received by lab (seed demo)`,
    },
  });

  console.log("Membuat sample demo #2: full sampai Final COA (APPROVED)...");

  const sampleFinal = await prisma.sample.create({
    data: {
      sampleNo: SAMPLE_NO_FINAL_COA,
      customerId: customer.id,
      coaTemplateId: template.id,
      status: "FINAL_COA",
      sentByCustomerAt: sentAt,
      receivedAt,
      receivedById: labAdmin.id,
      parameters: {
        create: templateParameters.map((tp) => ({
          parameterId: tp.parameterId,
          templateParameterId: tp.id,
          analystId: analyst.id,
          status: "VALIDATED",
          resultValue: DEMO_RESULTS[tp.parameter.name] ?? "0",
          displayNameSnapshot: tp.displayName,
          unitSnapshot: tp.unit,
          methodSnapshot: tp.method,
          standardSnapshot: tp.standard,
          limitSnapshot: tp.limitValue,
          reviewedById: supervisor.id,
          verifiedById: supervisor.id,
          validatedById: labManager.id,
        })),
      },
    },
  });

  const preliminaryCoa = await prisma.coa.create({
    data: {
      coaNo: generateDocumentNo("PRE-COA"),
      sampleId: sampleFinal.id,
      type: "PRELIMINARY",
      status: "CUSTOMER_CONFIRMED",
      createdById: labAdmin.id,
    },
  });

  const finalCoa = await prisma.coa.create({
    data: {
      coaNo: generateDocumentNo("FINAL-COA"),
      sampleId: sampleFinal.id,
      type: "FINAL",
      status: "APPROVED",
      createdById: labAdmin.id,
      approvedById: labManager.id,
    },
  });

  await prisma.workflowLog.createMany({
    data: [
      {
        actorId: labAdmin.id,
        sampleId: sampleFinal.id,
        action: "RECEIVE_SAMPLE",
        note: `Sample ${sampleFinal.sampleNo} received by lab (seed demo)`,
      },
      {
        actorId: supervisor.id,
        sampleId: sampleFinal.id,
        action: "DISTRIBUTE_SAMPLE_PARAMETER",
        note: "Parameters distributed for demo sample (seed demo)",
      },
      {
        actorId: supervisor.id,
        sampleId: sampleFinal.id,
        action: "BULK_REVIEW_RESULT",
        note: `Reviewed ${templateParameters.length} result(s) (seed demo)`,
      },
      {
        actorId: supervisor.id,
        sampleId: sampleFinal.id,
        action: "BULK_VERIFY_RESULT",
        note: `Verified ${templateParameters.length} result(s) (seed demo)`,
      },
      {
        actorId: labManager.id,
        sampleId: sampleFinal.id,
        action: "BULK_VALIDATE_RESULT",
        note: `Validated ${templateParameters.length} result(s) (seed demo)`,
      },
      {
        actorId: labAdmin.id,
        sampleId: sampleFinal.id,
        action: "CREATE_PRELIMINARY_COA",
        note: `Preliminary COA ${preliminaryCoa.coaNo} created (seed demo)`,
      },
      {
        actorId: null,
        sampleId: sampleFinal.id,
        action: "CUSTOMER_CONFIRM_PRELIMINARY_COA",
        note: `Customer confirmed preliminary COA ${preliminaryCoa.coaNo} (seed demo)`,
      },
      {
        actorId: labAdmin.id,
        sampleId: sampleFinal.id,
        action: "CREATE_FINAL_COA",
        note: `Final COA ${finalCoa.coaNo} dibuat, menunggu approval (seed demo)`,
      },
      {
        actorId: labManager.id,
        sampleId: sampleFinal.id,
        action: "APPROVE_FINAL_COA",
        note: `Final COA ${finalCoa.coaNo} disetujui (seed demo)`,
      },
    ],
  });

  console.log("\nSeed demo selesai.");
  console.log(`Sample RECEIVED : ${sampleReceived.sampleNo}`);
  console.log(`Sample FINAL COA: ${sampleFinal.sampleNo}`);
}

main()
  .catch((error) => {
    console.error("Seed demo gagal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
