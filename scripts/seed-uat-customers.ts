import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { nextCustomerCode } from "../src/lib/customer-code";

/**
 * Pelanggan untuk uji terima email quotation.
 *
 * Berbeda dari `seed-dummy-customers.ts` yang membuat ratusan baris untuk
 * menguji performa pencarian, berkas ini hanya membuat empat pelanggan yang
 * seluruh alamat emailnya milik penguji sendiri. Tujuannya satu: memastikan
 * quotation benar-benar sampai ke kotak masuk, lengkap dengan lampirannya.
 *
 * Dua di antaranya Direct dan dua lewat konsultan, supaya dua format penomoran
 * yang berbeda — DC.001.26xxxxx dan CC.001.26xxxxxxx — ikut teruji.
 *
 * Identitas perusahaan, alamat, dan NPWP di sini SELURUHNYA KARANGAN atas
 * permintaan pemilik produk. Jangan pernah dipakai untuk dokumen sungguhan.
 *
 * Pemakaian:
 *   pnpm db:seed:uat-customers            # buat / perbarui
 *   pnpm db:seed:uat-customers --purge    # hapus kembali
 *
 * Aman diulang: pencocokan memakai alamat email, jadi menjalankannya dua kali
 * tidak menggandakan data.
 */

const purge = process.argv.includes("--purge");

function createAdapter() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL belum ada di .env");

  const url = new URL(databaseUrl);
  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace("/", ""),
    connectionLimit: 10,
    connectTimeout: 20_000,
    acquireTimeout: 20_000,
  });
}

const prisma = new PrismaClient({ adapter: createAdapter() });

/** Konsultan pengantar untuk dua pelanggan bertipe CONSULTANT. */
const CONSULTANT = {
  code: "021",
  name: "Rafif Nur Aydin",
  company: "CV Aydin Konsultan Lingkungan",
  email: "rafifn.a18@gmail.com",
  phone: "0812-1000-0021",
  contactPerson: "Rafif Nur Aydin",
  address: "Jl. Konsultan Raya No. 21, Depok, Jawa Barat 16424",
};

type SeedCustomer = {
  email: string;
  customerType: "DIRECT" | "CONSULTANT";
  name: string;
  company: string;
  phone: string;
  contactPerson: string;
  addressLine1: string;
  city: string;
  province: string;
  npwp: string;
  billingCompany: string;
  billingEmail: string;
  samplingCompany: string;
  samplingAddressLine1: string;
};

const CUSTOMERS: SeedCustomer[] = [
  {
    email: "rafifn.a18@gmail.com",
    customerType: "DIRECT",
    name: "Rafif Nur Aydin",
    company: "PT Aydin Manufaktur Nusantara",
    phone: "0812-1000-0001",
    contactPerson: "Rafif Nur Aydin",
    addressLine1: "Kawasan Industri Jatiwangi Blok A-12",
    city: "Bekasi",
    province: "Jawa Barat",
    npwp: "01.234.567.8-001.000",
    billingCompany: "PT Aydin Manufaktur Nusantara",
    billingEmail: "rafifn.a18@gmail.com",
    samplingCompany: "PT Aydin Manufaktur Nusantara - Pabrik 1",
    samplingAddressLine1: "Kawasan Industri Jatiwangi Blok A-12, Bekasi",
  },
  {
    email: "rafifnuraydin.kuliah@gmail.com",
    customerType: "DIRECT",
    name: "Aydin Kuliah",
    company: "PT Politeknik Riset Terapan",
    phone: "0812-1000-0002",
    contactPerson: "Aydin Nuraydin",
    addressLine1: "Jl. Prof. Dr. G.A. Siwabessy Kav. 9",
    city: "Depok",
    province: "Jawa Barat",
    npwp: "02.345.678.9-002.000",
    billingCompany: "PT Politeknik Riset Terapan",
    billingEmail: "rafifnuraydin.kuliah@gmail.com",
    samplingCompany: "PT Politeknik Riset Terapan - Laboratorium",
    samplingAddressLine1: "Jl. Prof. Dr. G.A. Siwabessy Kav. 9, Depok",
  },
  {
    email: "indobarbar21@gmail.com",
    customerType: "CONSULTANT",
    name: "Indo Barbar",
    company: "PT Indo Barbar Sejahtera",
    phone: "0812-1000-0003",
    contactPerson: "Barbar Indonesia",
    addressLine1: "Jl. Industri Selatan V No. 88",
    city: "Cikarang",
    province: "Jawa Barat",
    npwp: "03.456.789.0-003.000",
    billingCompany: "PT Indo Barbar Sejahtera",
    billingEmail: "indobarbar21@gmail.com",
    samplingCompany: "PT Indo Barbar Sejahtera - IPAL",
    samplingAddressLine1: "Jl. Industri Selatan V No. 88, Cikarang",
  },
  {
    email: "rafifnurpro@gmail.com",
    customerType: "CONSULTANT",
    name: "Rafif Nur Pro",
    company: "PT Nurpro Energi Persada",
    phone: "0812-1000-0004",
    contactPerson: "Rafif Nurpro",
    addressLine1: "Jl. Raya Bogor KM 32, Gedung Nurpro Lt. 4",
    city: "Jakarta Timur",
    province: "DKI Jakarta",
    npwp: "04.567.890.1-004.000",
    billingCompany: "PT Nurpro Energi Persada",
    billingEmail: "rafifnurpro@gmail.com",
    samplingCompany: "PT Nurpro Energi Persada - Pembangkit",
    samplingAddressLine1: "Jl. Raya Bogor KM 32, Jakarta Timur",
  },
];

/** Keempat alamat penerima diisi sama agar seluruh dokumen menuju penguji. */
const ALL_EMAILS = CUSTOMERS.map((item) => item.email);

async function main() {
  if (purge) {
    const removed = await prisma.customer.deleteMany({
      where: { email: { in: ALL_EMAILS } },
    });
    await prisma.consultant.deleteMany({ where: { code: CONSULTANT.code } });
    console.log(`Dihapus: ${removed.count} pelanggan uji dan konsultannya.`);
    return;
  }

  const consultant = await prisma.consultant.upsert({
    where: { code: CONSULTANT.code },
    create: CONSULTANT,
    update: CONSULTANT,
    select: { id: true, code: true, company: true },
  });
  console.log(`Konsultan siap: ${consultant.code} — ${consultant.company}`);

  for (const item of CUSTOMERS) {
    const existing = await prisma.customer.findFirst({
      where: { email: item.email },
      select: { id: true, customerCode: true },
    });

    const shared = {
      customerType: item.customerType,
      name: item.name,
      company: item.company,
      email: item.email,
      phone: item.phone,
      isActive: true,

      contactPerson: item.contactPerson,
      addressLine1: item.addressLine1,
      city: item.city,
      province: item.province,
      npwp: item.npwp,
      npwpAddress: `${item.addressLine1}, ${item.city}`,

      billingCompany: item.billingCompany,
      billingAddressLine1: item.addressLine1,
      billingContactPerson: item.contactPerson,
      billingEmail: item.billingEmail,
      billingPhone: item.phone,

      samplingCompany: item.samplingCompany,
      samplingAddressLine1: item.samplingAddressLine1,
      samplingContactPerson: item.contactPerson,
      samplingPhone: item.phone,

      documentCompany: item.company,
      documentAddressLine1: item.addressLine1,
      documentContactPerson: item.contactPerson,
      documentPhone: item.phone,

      // Penerima 1 dipakai otomatis sebagai tujuan email quotation;
      // sisanya tersedia untuk diuji sebagai CC.
      recipientEmail1: item.email,
      recipientEmail2: ALL_EMAILS.find((value) => value !== item.email) ?? null,
      recipientEmail3: null,
      recipientEmail4: null,

      consultantId: item.customerType === "CONSULTANT" ? consultant.id : null,
    };

    if (existing) {
      // Update customerType + consultant juga supaya tidak stuck sebagai DIRECT
      await prisma.customer.update({
        where: { id: existing.id },
        data: {
          ...shared,
          customerType: item.customerType,
          consultantId: item.customerType === "CONSULTANT" ? consultant.id : null,
        },
      });
      console.log(`  diperbarui  ${existing.customerCode ?? "(tanpa kode)"}  ${item.company}`);
      continue;
    }

    // Kode pelanggan dibuat lewat generator resmi agar format DC/CC yang
    // tercetak pada dokumen benar-benar sama dengan alur aplikasi.
    const code = await nextCustomerCode(prisma, {
      customerType: item.customerType,
      centerCode: "001",
      consultantCode: item.customerType === "CONSULTANT" ? consultant.code : null,
    });

    const created = await prisma.customer.create({
      data: {
        ...shared,
        customerCode: code.customerCode,
        centerCode: code.centerCode,
        joinYear: code.joinYear,
        sequenceNo: code.sequenceNo,
      },
      select: { customerCode: true },
    });
    console.log(`  dibuat      ${created.customerCode}  ${item.company}`);
  }

  const total = await prisma.customer.count({ where: { email: { in: ALL_EMAILS } } });
  console.log(`\nSelesai. ${total} pelanggan uji siap dipakai.`);
  console.log("Seluruh identitas perusahaan di sini karangan — jangan dipakai untuk dokumen sungguhan.");
}

main()
  .catch((error) => {
    console.error("Gagal membuat pelanggan uji:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
