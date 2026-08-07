import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";

/**
 * Pembuatan customer ringkas dari dalam form quotation.
 *
 * POST /api/master/customers hanya bisa dipakai role yang punya izin
 * `master.customers` canCreate, sementara sales perlu menambah customer baru
 * tanpa keluar dari form quotation. Endpoint ini menerima kolom minimum saja;
 * alamat, NPWP, dan data penagihan dilengkapi belakangan di Master Customer.
 */

const nullableString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().optional().nullable()
);

const quickCustomerSchema = z.object({
  name: z.string().trim().min(3, "Nama customer minimal 3 karakter"),
  contactPerson: nullableString,
  phone: nullableString,
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().email("Email tidak valid").optional().nullable()
  ),
  city: nullableString,
});

export async function POST(request: Request) {
  const permission = await requireAnyApiPermission([
    { menuKey: "quotation.request", action: "canCreate" },
    { menuKey: "master.customers", action: "canCreate" },
  ]);

  if (!permission.allowed) return permission.response;

  const parsed = quickCustomerSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Data customer tidak valid",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Nama customer tidak unik di skema, tetapi duplikat menyulitkan sales
  // menemukan yang benar. Tolak duplikat persis dan tunjuk ke data yang ada.
  const duplicate = await prisma.customer.findFirst({
    where: { name: data.name },
    select: { id: true, name: true, city: true },
  });

  if (duplicate) {
    return NextResponse.json(
      {
        message: `Customer "${duplicate.name}" sudah terdaftar.`,
        existing: duplicate,
      },
      { status: 409 }
    );
  }

  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      company: data.name,
      contactPerson: data.contactPerson ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      city: data.city ?? null,
    },
    select: {
      id: true,
      name: true,
      company: true,
      city: true,
      province: true,
      contactPerson: true,
      email: true,
      phone: true,
    },
  });

  return NextResponse.json({ customer }, { status: 201 });
}
