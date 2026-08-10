import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

const schema = z.object({
  status: z.enum(["NEW", "QUALIFYING", "SURVEY_REQUIRED", "SURVEY_IN_PROGRESS", "READY_FOR_QUOTATION", "QUOTATION_CREATED", "NOT_SUPPORTED", "LOST"]).optional(),
  capabilityStatus: z.enum(["PENDING", "SUPPORTED", "NEEDS_SURVEY", "NOT_SUPPORTED"]).optional(),
  assignedToId: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const permission = await requireApiPermission("marketing.leads", "canUpdate");
  if (!permission.allowed) return permission.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ message: "Perubahan lead tidak valid" }, { status: 400 });
  const { id } = await context.params;
  const data = { ...parsed.data };
  if (data.capabilityStatus === "NOT_SUPPORTED") data.status = "NOT_SUPPORTED";
  if (data.capabilityStatus === "NEEDS_SURVEY") data.status = "SURVEY_REQUIRED";
  if (data.capabilityStatus === "SUPPORTED" && !data.status) data.status = "READY_FOR_QUOTATION";
  const lead = await prisma.lead.update({ where: { id }, data });
  return NextResponse.json({ message: "Lead berhasil diperbarui", lead });
}
