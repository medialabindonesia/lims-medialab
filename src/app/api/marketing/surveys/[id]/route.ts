import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

const parameter = z.object({
  regulationParameterId: z.string().optional().nullable(),
  parameterName: z.string().trim().min(1),
  regulationName: z.string().optional().nullable(),
  method: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  samplingLocation: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});
const schema = z.object({
  status: z.enum(["RECOMMENDED", "SCHEDULED", "IN_PROGRESS", "RESUME_READY", "COMPLETED", "CANCELLED"]),
  conductedAt: z.string().optional().nullable(),
  resumeSummary: z.string().trim().min(10, "Resume survey minimal 10 karakter"),
  resumeFileUrl: z.string().optional().nullable(),
  parameters: z.array(parameter).min(1, "Resume minimal berisi satu parameter"),
});
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const permission = await requireApiPermission("marketing.leads", "canUpdate");
  if (!permission.allowed) return permission.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message || "Resume survey tidak valid" }, { status: 400 });
  const { id } = await context.params;
  const existing = await prisma.survey.findUnique({ where: { id }, select: { leadId: true } });
  if (!existing) return NextResponse.json({ message: "Survey tidak ditemukan" }, { status: 404 });
  const survey = await prisma.$transaction(async (tx) => {
    await tx.surveyParameter.deleteMany({ where: { surveyId: id } });
    const updated = await tx.survey.update({
      where: { id },
      data: {
        status: parsed.data.status,
        conductedAt: parsed.data.conductedAt ? new Date(parsed.data.conductedAt) : new Date(),
        resumeSummary: parsed.data.resumeSummary,
        resumeFileUrl: parsed.data.resumeFileUrl || null,
        parameters: { create: parsed.data.parameters.map((item, index) => ({ ...item, sort: (index + 1) * 10 })) },
      },
      include: { parameters: { orderBy: { sort: "asc" } } },
    });
    if (["RESUME_READY", "COMPLETED"].includes(parsed.data.status)) {
      await tx.lead.update({ where: { id: existing.leadId }, data: { status: "READY_FOR_QUOTATION", capabilityStatus: "SUPPORTED" } });
    }
    return updated;
  });
  return NextResponse.json({ message: "Resume survey tersimpan dan siap menjadi dasar quotation", survey });
}
