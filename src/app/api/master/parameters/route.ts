import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

const parameterSchema = z.object({
  name: z.string().min(1, "Nama parameter wajib diisi"),
  unit: z.string().optional().nullable(),
  method: z.string().optional().nullable(),
  price: z.coerce.number().min(0, "Harga tidak boleh minus"),
  isActive: z.boolean().optional(),
});

export async function GET(request: Request) {
  const permission = await requireApiPermission("master.parameters", "canView");
  if (!permission.allowed) return permission.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  const parameters = await prisma.analysisParameter.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { unit: { contains: q } },
            { method: { contains: q } },
          ],
        }
      : undefined,
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ parameters });
}

export async function POST(request: Request) {
  const permission = await requireApiPermission("master.parameters", "canCreate");
  if (!permission.allowed) return permission.response;

  const body = await request.json();
  const parsed = parameterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: parsed.error.issues[0]?.message || "Data tidak valid",
      },
      { status: 400 }
    );
  }

  const parameter = await prisma.analysisParameter.create({
    data: {
      name: parsed.data.name,
      unit: parsed.data.unit || null,
      method: parsed.data.method || null,
      price: parsed.data.price,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({
    message: "Parameter berhasil dibuat",
    parameter,
  });
}