import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAnyApiPermission } from "@/lib/api-permission";

export const runtime = "nodejs";

const columns = [
  "name",
  "company",
  "contactPerson",
  "email",
  "phone",
  "addressLine1",
  "addressLine2",
  "city",
  "province",
  "billingCompany",
  "billingAddressLine1",
  "billingAddressLine2",
  "billingContactPerson",
  "billingEmail",
  "billingPhone",
  "npwp",
  "npwpAddress",
  "samplingCompany",
  "samplingAddressLine1",
  "samplingAddressLine2",
  "documentCompany",
  "recipientEmail1",
  "createLogin",
  "loginEmail",
  "loginPassword",
  "isActive",
];

function setThinBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };
}

export async function GET() {
  const permission = await requireAnyApiPermission([
    { menuKey: "master.customer", action: "canView" },
    { menuKey: "master.customers", action: "canView" },
    { menuKey: "admin.rbac", action: "canView" },
  ]);

  if (!permission.allowed) return permission.response;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LIMS-Medialab";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Customer Import Template", {
    views: [{ showGridLines: false }],
  });

  sheet.columns = columns.map((key) => ({
    header: key,
    key,
    width: Math.max(18, key.length + 4),
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 26;

  headerRow.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF10B981" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    setThinBorder(cell);
  });

  sheet.addRow({
    name: "PT Customer Demo Indonesia",
    company: "PT Customer Demo Indonesia",
    contactPerson: "Budi Santoso",
    email: "customer.demo@example.com",
    phone: "081234567890",
    addressLine1: "Jl. Contoh Raya No. 1",
    addressLine2: "Jakarta Selatan",
    city: "Jakarta",
    province: "DKI Jakarta",
    billingCompany: "PT Customer Demo Indonesia",
    billingAddressLine1: "Jl. Contoh Raya No. 1",
    billingAddressLine2: "Jakarta Selatan",
    billingContactPerson: "Budi Finance",
    billingEmail: "billing.demo@example.com",
    billingPhone: "081234567890",
    npwp: "00.000.000.0-000.000",
    npwpAddress: "Jl. Contoh Raya No. 1, Jakarta Selatan",
    samplingCompany: "PT Customer Demo Indonesia",
    samplingAddressLine1: "Area Produksi 1",
    samplingAddressLine2: "Jakarta Selatan",
    documentCompany: "PT Customer Demo Indonesia",
    recipientEmail1: "coa.demo@example.com",
    createLogin: "YES",
    loginEmail: "customer.demo@example.com",
    loginPassword: "customer123",
    isActive: "YES",
  });

  sheet.addRow({
    name: "CV Sample Dua",
    company: "CV Sample Dua",
    contactPerson: "Sari Wulandari",
    email: "sari@example.com",
    phone: "089876543210",
    addressLine1: "Jl. Sample No. 2",
    addressLine2: "Bekasi",
    city: "Bekasi",
    province: "Jawa Barat",
    billingCompany: "CV Sample Dua",
    billingAddressLine1: "Jl. Sample No. 2",
    billingAddressLine2: "Bekasi",
    billingContactPerson: "Sari",
    billingEmail: "sari.billing@example.com",
    billingPhone: "089876543210",
    npwp: "",
    npwpAddress: "",
    samplingCompany: "CV Sample Dua",
    samplingAddressLine1: "Area Workshop",
    samplingAddressLine2: "Bekasi",
    documentCompany: "CV Sample Dua",
    recipientEmail1: "sari.coa@example.com",
    createLogin: "NO",
    loginEmail: "",
    loginPassword: "",
    isActive: "YES",
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    row.height = 24;

    row.eachCell((cell) => {
      cell.alignment = {
        vertical: "top",
        wrapText: true,
      };
      setThinBorder(cell);
    });
  });

  const noteSheet = workbook.addWorksheet("Petunjuk", {
    views: [{ showGridLines: false }],
  });

  noteSheet.columns = [{ width: 30 }, { width: 90 }];

  noteSheet.addRows([
    ["Kolom", "Keterangan"],
    ["name", "Wajib diisi. Nama customer."],
    ["email", "Wajib diisi. Dipakai sebagai identitas unik customer."],
    ["createLogin", "Isi YES jika ingin otomatis membuat akun login customer."],
    ["loginEmail", "Email login customer. Jika kosong, sistem memakai email customer."],
    ["loginPassword", "Minimal 6 karakter jika createLogin = YES."],
    ["isActive", "Isi YES/NO. Default YES."],
  ]);

  noteSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF10B981" },
    };
    setThinBorder(cell);
  });

  noteSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      setThinBorder(cell);
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="template-import-customer-lims-medialab.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}