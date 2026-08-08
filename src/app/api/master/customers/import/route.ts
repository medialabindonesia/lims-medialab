import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { getCell, readHeaderMap, yes } from "@/lib/excel-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const permission = await requireAnyApiPermission([
    { menuKey: "master.customer", action: "canCreate" },
    { menuKey: "master.customers", action: "canCreate" },
    { menuKey: "admin.rbac", action: "canView" },
  ]);

  if (!permission.allowed) return permission.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "File Excel wajib diupload" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]
    );

    const sheet = workbook.worksheets[0];

    if (!sheet) {
      return NextResponse.json(
        { message: "Sheet Excel tidak ditemukan" },
        { status: 400 }
      );
    }

    const headerMap = readHeaderMap(sheet);

    const requiredHeaders = ["name", "email"];

    for (const header of requiredHeaders) {
      if (!headerMap.has(header)) {
        return NextResponse.json(
          { message: `Header wajib '${header}' tidak ditemukan` },
          { status: 400 }
        );
      }
    }

    const customerRole = await prisma.role.findUnique({
      where: {
        code: "CUSTOMER_ENGAGEMENT",
      },
    });

    let created = 0;
    let updated = 0;
    let userCreated = 0;
    let userUpdated = 0;

    const errors: string[] = [];

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);

      const name = getCell(row, headerMap, "name");
      const email = getCell(row, headerMap, "email");

      if (!name && !email) continue;

      if (!name || !email) {
        errors.push(`Row ${rowNumber}: name dan email wajib diisi`);
        continue;
      }

      const data = {
        name,
        company: getCell(row, headerMap, "company"),
        contactPerson: getCell(row, headerMap, "contactPerson"),
        email,
        phone: getCell(row, headerMap, "phone"),
        addressLine1: getCell(row, headerMap, "addressLine1"),
        addressLine2: getCell(row, headerMap, "addressLine2"),
        city: getCell(row, headerMap, "city"),
        province: getCell(row, headerMap, "province"),

        billingCompany: getCell(row, headerMap, "billingCompany"),
        billingAddressLine1: getCell(row, headerMap, "billingAddressLine1"),
        billingAddressLine2: getCell(row, headerMap, "billingAddressLine2"),
        billingContactPerson: getCell(row, headerMap, "billingContactPerson"),
        billingEmail: getCell(row, headerMap, "billingEmail"),
        billingPhone: getCell(row, headerMap, "billingPhone"),

        npwp: getCell(row, headerMap, "npwp"),
        npwpAddress: getCell(row, headerMap, "npwpAddress"),

        samplingCompany: getCell(row, headerMap, "samplingCompany"),
        samplingAddressLine1: getCell(row, headerMap, "samplingAddressLine1"),
        samplingAddressLine2: getCell(row, headerMap, "samplingAddressLine2"),

        documentCompany: getCell(row, headerMap, "documentCompany"),
        recipientEmail1: getCell(row, headerMap, "recipientEmail1"),

        isActive: headerMap.has("isActive")
          ? yes(getCell(row, headerMap, "isActive"))
          : true,
      };

      const existing = await prisma.customer.findFirst({
        where: {
          OR: [
            {
              email,
            },
            {
              AND: [
                {
                  name,
                },
                {
                  company: data.company,
                },
              ],
            },
          ],
        },
      });

      const customer = existing
        ? await prisma.customer.update({
            where: {
              id: existing.id,
            },
            data,
          })
        : await prisma.customer.create({
            data,
          });

      if (existing) updated++;
      else created++;

      const createLogin = yes(getCell(row, headerMap, "createLogin"));
      const loginEmail = getCell(row, headerMap, "loginEmail") || email;
      const loginPassword = getCell(row, headerMap, "loginPassword");

      if (createLogin) {
        if (!customerRole) {
          errors.push(
            `Row ${rowNumber}: role CUSTOMER_ENGAGEMENT tidak ditemukan`
          );
          continue;
        }

        if (!loginEmail || !loginPassword) {
          errors.push(
            `Row ${rowNumber}: loginEmail dan loginPassword wajib diisi jika createLogin YES`
          );
          continue;
        }

        if (loginPassword.length < 6) {
          errors.push(`Row ${rowNumber}: loginPassword minimal 6 karakter`);
          continue;
        }

        const existingUser = await prisma.user.findUnique({
          where: {
            email: loginEmail,
          },
        });

        if (!existingUser) {
          const passwordHash = await bcrypt.hash(loginPassword, 10);

          await prisma.user.create({
            data: {
              name,
              email: loginEmail,
              password: passwordHash,
              roleId: customerRole.id,
              customerId: customer.id,
              isActive: true,
            },
          });

          userCreated++;
        } else {
          const updateData: Prisma.UserUncheckedUpdateInput = {
            name: existingUser.name || name,
            customerId: customer.id,
            roleId: customerRole.id,
            isActive: true,
          };

          if (loginPassword) {
            updateData.password = await bcrypt.hash(loginPassword, 10);
          }

          await prisma.user.update({
            where: {
              id: existingUser.id,
            },
            data: updateData,
          });

          userUpdated++;
        }
      }
    }

    return NextResponse.json({
      message: `Import selesai. Created: ${created}, Updated: ${updated}, User Created: ${userCreated}, User Updated: ${userUpdated}`,
      created,
      updated,
      userCreated,
      userUpdated,
      errors,
    });
  } catch (error) {
    console.error("IMPORT_CUSTOMER_ERROR:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat import customer",
      },
      { status: 500 }
    );
  }
}
