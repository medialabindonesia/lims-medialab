import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";
import { nextSurveyNo } from "@/lib/marketing-number";

const schema = z.object({
  scope: z.string().trim().min(3, "Scope survey wajib diisi"),
  location: z.string().trim().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  assignedToId: z.string().min(1, "Pelaksana survey wajib dipilih"),
});
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const permission = await requireApiPermission("marketing.leads", "canCreate");
  if (!permission.allowed) return permission.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message || "Data survey tidak valid" }, { status: 400 });
  const { id } = await context.params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ message: "Lead tidak ditemukan" }, { status: 404 });

  const survey = await prisma.$transaction(async (tx) => {
    const created = await tx.survey.create({
      data: {
        leadId: id,
        surveyNo: await nextSurveyNo(tx),
        scope: parsed.data.scope,
        location: parsed.data.location || null,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        assignedToId: parsed.data.assignedToId,
        recommendedById: permission.session?.userId,
        status: parsed.data.scheduledAt ? "SCHEDULED" : "RECOMMENDED",
      },
    });
    await tx.lead.update({ where: { id }, data: { status: "SURVEY_IN_PROGRESS", capabilityStatus: "NEEDS_SURVEY" } });
    return created;
  });
  return NextResponse.json({ message: `Survey ${survey.surveyNo} dibuat`, survey }, { status: 201 });
}
