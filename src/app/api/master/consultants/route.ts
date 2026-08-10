import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

const nullableString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().optional().nullable()
);
const consultantSchema = z.object({
  name: z.string().trim().min(2, "Nama consultant wajib diisi"),
  company: nullableString,
  email: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().email("Email tidak valid").optional().nullable()
  ),
  phone: nullableString,
  contactPerson: nullableString,
});

export async function GET() {
  const permission = await requireApiPermission("master.customers", "canView");
  if (!permission.allowed) return permission.response;
  const consultants = await prisma.consultant.findMany({
    include: { _count: { select: { customers: true } } },
    orderBy: { code: "asc" },
  });
  return NextResponse.json({ consultants });
}

export async function POST(request: Request) {
  const permission = await requireApiPermission("master.customers", "canCreate");
  if (!permission.allowed) return permission.response;
  const parsed = consultantSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Data tidak valid" }, { status: 400 });
  }

  const last = await prisma.consultant.findFirst({ orderBy: { code: "desc" }, select: { code: true } });
  const next = (Number.parseInt(last?.code || "0", 10) || 0) + 1;
  if (next > 999) {
    return NextResponse.json({ message: "Nomor consultant 3 digit sudah habis" }, { status: 409 });
  }
  const consultant = await prisma.consultant.create({
    data: {
      code: String(next).padStart(3, "0"),
      name: parsed.data.name,
      company: parsed.data.company,
      email: parsed.data.email?.toLowerCase() || null,
      phone: parsed.data.phone,
      contactPerson: parsed.data.contactPerson,
    },
  });
  return NextResponse.json({ message: `Consultant ${consultant.code} berhasil dibuat`, consultant }, { status: 201 });
}
