import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

const nullableString = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().optional().nullable()
);

const nullableEmail = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().email("Email tidak valid").optional().nullable()
);

const customerSchema = z.object({
  name: z.string().min(1, "Nama customer wajib diisi"),
  company: nullableString,
  email: nullableEmail,
  phone: nullableString,
  isActive: z.boolean().optional(),

  contactPerson: nullableString,
  addressLine1: nullableString,
  addressLine2: nullableString,
  city: nullableString,
  province: nullableString,
  npwp: nullableString,
  npwpAddress: nullableString,

  billingCompany: nullableString,
  billingAddressLine1: nullableString,
  billingAddressLine2: nullableString,
  billingContactPerson: nullableString,
  billingEmail: nullableEmail,
  billingPhone: nullableString,

  samplingCompany: nullableString,
  samplingAddressLine1: nullableString,
  samplingAddressLine2: nullableString,
  samplingContactPerson: nullableString,
  samplingPhone: nullableString,

  documentCompany: nullableString,
  documentAddressLine1: nullableString,
  documentAddressLine2: nullableString,
  documentContactPerson: nullableString,
  documentPhone: nullableString,

  recipientEmail1: nullableEmail,
  recipientEmail2: nullableEmail,
  recipientEmail3: nullableEmail,
  recipientEmail4: nullableEmail,

  createLoginAccount: z.boolean().optional(),
  loginEmail: nullableEmail,
  loginPassword: z.string().optional().nullable(),
});

export async function GET() {
  const permission = await requireApiPermission("master.customers", "canView");
  if (!permission.allowed) return permission.response;

  const customers = await prisma.customer.findMany({
    include: {
      users: {
        include: {
          role: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ customers });
}

export async function POST(request: Request) {
  const permission = await requireApiPermission("master.customers", "canCreate");
  if (!permission.allowed) return permission.response;

  const body = await request.json();
  const parsed = customerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  const email = parsed.data.email?.toLowerCase() || null;
  const loginEmail =
    parsed.data.loginEmail?.toLowerCase() || email || parsed.data.recipientEmail1?.toLowerCase() || null;

  if (email) {
    const existingEmail = await prisma.customer.findFirst({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { message: "Email customer sudah digunakan" },
        { status: 400 }
      );
    }
  }

  if (parsed.data.createLoginAccount) {
    if (!loginEmail) {
      return NextResponse.json(
        { message: "Email login customer wajib diisi" },
        { status: 400 }
      );
    }

    const loginPassword = parsed.data.loginPassword || "";

    if (loginPassword.length < 6) {
      return NextResponse.json(
        { message: "Password login minimal 6 karakter" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: loginEmail,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email login sudah digunakan user lain" },
        { status: 400 }
      );
    }
  }

  const customerRole = parsed.data.createLoginAccount
    ? await prisma.role.findUnique({
        where: {
          code: "CUSTOMER_ENGAGEMENT",
        },
      })
    : null;

  if (parsed.data.createLoginAccount && !customerRole) {
    return NextResponse.json(
      { message: "Role CUSTOMER_ENGAGEMENT tidak ditemukan" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        name: parsed.data.name,
        company: parsed.data.company || null,
        email,
        phone: parsed.data.phone || null,
        isActive: parsed.data.isActive ?? true,

        contactPerson: parsed.data.contactPerson || null,
        addressLine1: parsed.data.addressLine1 || null,
        addressLine2: parsed.data.addressLine2 || null,
        city: parsed.data.city || null,
        province: parsed.data.province || null,
        npwp: parsed.data.npwp || null,
        npwpAddress: parsed.data.npwpAddress || null,

        billingCompany: parsed.data.billingCompany || null,
        billingAddressLine1: parsed.data.billingAddressLine1 || null,
        billingAddressLine2: parsed.data.billingAddressLine2 || null,
        billingContactPerson: parsed.data.billingContactPerson || null,
        billingEmail: parsed.data.billingEmail?.toLowerCase() || null,
        billingPhone: parsed.data.billingPhone || null,

        samplingCompany: parsed.data.samplingCompany || null,
        samplingAddressLine1: parsed.data.samplingAddressLine1 || null,
        samplingAddressLine2: parsed.data.samplingAddressLine2 || null,
        samplingContactPerson: parsed.data.samplingContactPerson || null,
        samplingPhone: parsed.data.samplingPhone || null,

        documentCompany: parsed.data.documentCompany || null,
        documentAddressLine1: parsed.data.documentAddressLine1 || null,
        documentAddressLine2: parsed.data.documentAddressLine2 || null,
        documentContactPerson: parsed.data.documentContactPerson || null,
        documentPhone: parsed.data.documentPhone || null,

        recipientEmail1: parsed.data.recipientEmail1?.toLowerCase() || null,
        recipientEmail2: parsed.data.recipientEmail2?.toLowerCase() || null,
        recipientEmail3: parsed.data.recipientEmail3?.toLowerCase() || null,
        recipientEmail4: parsed.data.recipientEmail4?.toLowerCase() || null,
      },
    });

    if (parsed.data.createLoginAccount && customerRole && loginEmail) {
      const hashedPassword = await bcrypt.hash(parsed.data.loginPassword || "", 10);

      await tx.user.create({
        data: {
          name: parsed.data.contactPerson || parsed.data.name,
          email: loginEmail,
          password: hashedPassword,
          roleId: customerRole.id,
          customerId: customer.id,
          isActive: true,
        },
      });
    }

    return tx.customer.findUnique({
      where: {
        id: customer.id,
      },
      include: {
        users: {
          include: {
            role: true,
          },
        },
      },
    });
  });

  return NextResponse.json({
    message: parsed.data.createLoginAccount
      ? "Customer dan akun login berhasil dibuat"
      : "Customer berhasil dibuat",
    customer: result,
  });
}