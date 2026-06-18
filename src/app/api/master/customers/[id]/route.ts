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
  resetPassword: z.string().optional().nullable(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const permission = await requireApiPermission("master.customers", "canView");
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      users: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!customer) {
    return NextResponse.json(
      { message: "Customer tidak ditemukan" },
      { status: 404 }
    );
  }

  return NextResponse.json({ customer });
}

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await requireApiPermission("master.customers", "canUpdate");
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;
  const body = await request.json();

  const parsed = customerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  const current = await prisma.customer.findUnique({
    where: { id },
    include: {
      users: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!current) {
    return NextResponse.json(
      { message: "Customer tidak ditemukan" },
      { status: 404 }
    );
  }

  const email = parsed.data.email?.toLowerCase() || null;

  if (email) {
    const duplicateEmail = await prisma.customer.findFirst({
      where: {
        email,
        NOT: { id },
      },
    });

    if (duplicateEmail) {
      return NextResponse.json(
        { message: "Email customer sudah digunakan customer lain" },
        { status: 400 }
      );
    }
  }

  const customerRole = await prisma.role.findUnique({
    where: {
      code: "CUSTOMER_ENGAGEMENT",
    },
  });

  const existingLoginUser =
    current.users.find((user) => user.role?.code === "CUSTOMER_ENGAGEMENT") ||
    current.users[0] ||
    null;

  const loginEmail =
    parsed.data.loginEmail?.toLowerCase() || existingLoginUser?.email || email || null;

  const wantsCreateLogin = Boolean(parsed.data.createLoginAccount);
  const wantsResetPassword = Boolean(parsed.data.resetPassword);

  if (wantsCreateLogin && !existingLoginUser) {
    if (!customerRole) {
      return NextResponse.json(
        { message: "Role CUSTOMER_ENGAGEMENT tidak ditemukan" },
        { status: 400 }
      );
    }

    if (!loginEmail) {
      return NextResponse.json(
        { message: "Email login customer wajib diisi" },
        { status: 400 }
      );
    }

    const loginPassword = parsed.data.loginPassword || parsed.data.resetPassword || "";

    if (loginPassword.length < 6) {
      return NextResponse.json(
        { message: "Password akun login minimal 6 karakter" },
        { status: 400 }
      );
    }

    const duplicateUser = await prisma.user.findUnique({
      where: {
        email: loginEmail,
      },
    });

    if (duplicateUser) {
      return NextResponse.json(
        { message: "Email login sudah digunakan user lain" },
        { status: 400 }
      );
    }
  }

  if (existingLoginUser && loginEmail && loginEmail !== existingLoginUser.email) {
    const duplicateUser = await prisma.user.findFirst({
      where: {
        email: loginEmail,
        NOT: {
          id: existingLoginUser.id,
        },
      },
    });

    if (duplicateUser) {
      return NextResponse.json(
        { message: "Email login sudah digunakan user lain" },
        { status: 400 }
      );
    }
  }

  if (wantsResetPassword && (parsed.data.resetPassword || "").length < 6) {
    return NextResponse.json(
      { message: "Reset password minimal 6 karakter" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedCustomer = await tx.customer.update({
      where: { id },
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

    if (existingLoginUser) {
      const passwordData = wantsResetPassword
        ? {
            password: await bcrypt.hash(parsed.data.resetPassword || "", 10),
          }
        : {};

      await tx.user.update({
        where: {
          id: existingLoginUser.id,
        },
        data: {
          name: parsed.data.contactPerson || parsed.data.name,
          email: loginEmail || existingLoginUser.email,
          customerId: updatedCustomer.id,
          isActive: parsed.data.isActive ?? true,
          ...passwordData,
        },
      });
    }

    if (wantsCreateLogin && !existingLoginUser && customerRole && loginEmail) {
      const password = parsed.data.loginPassword || parsed.data.resetPassword || "";
      const hashedPassword = await bcrypt.hash(password, 10);

      await tx.user.create({
        data: {
          name: parsed.data.contactPerson || parsed.data.name,
          email: loginEmail,
          password: hashedPassword,
          roleId: customerRole.id,
          customerId: updatedCustomer.id,
          isActive: true,
        },
      });
    }

    return tx.customer.findUnique({
      where: {
        id: updatedCustomer.id,
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
    message: "Customer berhasil diupdate",
    customer: result,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const permission = await requireApiPermission("master.customers", "canDelete");
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const customer = await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: {
        customerId: id,
      },
      data: {
        isActive: false,
      },
    });

    return tx.customer.update({
      where: { id },
      data: {
        isActive: false,
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
    message: "Customer dan akun login berhasil dinonaktifkan",
    customer,
  });
}