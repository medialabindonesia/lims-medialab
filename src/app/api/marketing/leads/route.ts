import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";
import { nextLeadNo } from "@/lib/marketing-number";

const nullableString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().optional().nullable()
);
const schema = z.object({
  customerId: z.string().min(1, "Customer wajib dipilih"),
  requestedTests: z.string().trim().min(3, "Kebutuhan pengujian wajib dijelaskan"),
  customerKnowsScope: z.boolean().default(false),
  capabilityStatus: z.enum(["PENDING", "SUPPORTED", "NEEDS_SURVEY", "NOT_SUPPORTED"]).default("PENDING"),
  contactName: z.string().trim().min(2, "Nama contact person wajib diisi"),
  contactEmail: z.string().email("Email contact person tidak valid"),
  contactPhone: z.string().trim().min(6, "Nomor kontak wajib diisi"),
  source: nullableString,
  note: nullableString,
  assignedToId: nullableString,
});

const include = {
  customer: { include: { consultant: true } },
  createdBy: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  quotation: { select: { id: true, quotationNo: true, status: true } },
  surveys: {
    include: {
      assignedTo: { select: { id: true, name: true } },
      parameters: { orderBy: { sort: "asc" as const } },
    },
    orderBy: { createdAt: "desc" as const },
  },
};

export async function GET() {
  const permission = await requireApiPermission("marketing.leads", "canView");
  if (!permission.allowed) return permission.response;
  const leads = await prisma.lead.findMany({ include, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ leads });
}

export async function POST(request: Request) {
  const permission = await requireApiPermission("marketing.leads", "canCreate");
  if (!permission.allowed) return permission.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Data lead tidak valid" }, { status: 400 });
  }
  const customer = await prisma.customer.findFirst({ where: { id: parsed.data.customerId, isActive: true } });
  if (!customer) return NextResponse.json({ message: "Customer tidak ditemukan / nonaktif" }, { status: 400 });

  const status = parsed.data.capabilityStatus === "NOT_SUPPORTED"
    ? "NOT_SUPPORTED"
    : parsed.data.capabilityStatus === "NEEDS_SURVEY" || !parsed.data.customerKnowsScope
      ? "SURVEY_REQUIRED"
      : parsed.data.capabilityStatus === "SUPPORTED"
        ? "READY_FOR_QUOTATION"
        : "QUALIFYING";
  const lead = await prisma.lead.create({
    data: {
      ...parsed.data,
      leadNo: await nextLeadNo(prisma),
      status,
      contactEmail: parsed.data.contactEmail.toLowerCase(),
      createdById: permission.session?.userId,
    },
    include,
  });
  return NextResponse.json({ message: `Lead ${lead.leadNo} berhasil dibuat`, lead }, { status: 201 });
}
