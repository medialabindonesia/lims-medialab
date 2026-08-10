import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

function prefix(kind: "LD" | "SV", date = new Date()) {
  return `${kind}.001.${String(date.getFullYear()).slice(-2)}`;
}

export async function nextLeadNo(db: Db, date = new Date()) {
  const numberPrefix = prefix("LD", date);
  const last = await db.lead.findFirst({
    where: { leadNo: { startsWith: numberPrefix } },
    orderBy: { leadNo: "desc" },
    select: { leadNo: true },
  });
  const previous = last?.leadNo
    ? Number.parseInt(last.leadNo.slice(numberPrefix.length), 10)
    : 0;
  return `${numberPrefix}${String((Number.isFinite(previous) ? previous : 0) + 1).padStart(5, "0")}`;
}

export async function nextSurveyNo(db: Db, date = new Date()) {
  const numberPrefix = prefix("SV", date);
  const last = await db.survey.findFirst({
    where: { surveyNo: { startsWith: numberPrefix } },
    orderBy: { surveyNo: "desc" },
    select: { surveyNo: true },
  });
  const previous = last?.surveyNo
    ? Number.parseInt(last.surveyNo.slice(numberPrefix.length), 10)
    : 0;
  return `${numberPrefix}${String((Number.isFinite(previous) ? previous : 0) + 1).padStart(5, "0")}`;
}
