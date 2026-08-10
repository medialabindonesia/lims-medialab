import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

/**
 * Membuat customer dummy untuk menguji pencarian, pengurutan, dan performa
 * dropdown customer pada form quotation.
 *
 * Data asli Medialab berjumlah ratusan mendekati ribuan, sementara seed hanya
 * berisi 2 customer contoh. Tanpa data sebanyak ini, perilaku pencarian tidak
 * bisa dibuktikan.
 *
 * Pemakaian:
 *   npx tsx scripts/seed-dummy-customers.ts            # 600 customer
 *   npx tsx scripts/seed-dummy-customers.ts --count=1500
 *   npx tsx scripts/seed-dummy-customers.ts --purge    # hapus semua dummy
 *
 * Semua data dummy memakai email berakhiran DUMMY_EMAIL_SUFFIX sehingga bisa
 * dihapus total tanpa menyentuh data asli. Script menolak berjalan bila
 * NODE_ENV=production kecuali diberi --force.
 */

const DUMMY_EMAIL_SUFFIX = "@dummy.medialab.test";
const DEFAULT_COUNT = 600;

const BADAN_USAHA = ["PT", "PT", "PT", "CV", "UD", "PT Tbk"];

const KATA_1 = [
  "Sumber", "Cahaya", "Karya", "Mitra", "Bina", "Adi", "Tri", "Panca",
  "Graha", "Surya", "Buana", "Sinar", "Anugerah", "Berkah", "Jaya",
  "Prima", "Nusantara", "Gemilang", "Sejahtera", "Makmur", "Harapan",
  "Dwi", "Eka", "Citra", "Wijaya", "Kencana", "Mustika", "Sentosa",
];

const KATA_2 = [
  "Abadi", "Lestari", "Perkasa", "Utama", "Mandiri", "Sentosa", "Persada",
  "Nusantara", "Indonesia", "Pratama", "Sejati", "Bersama", "Agung",
  "Makmur", "Jaya", "Sukses", "Global", "Internasional", "Raya", "Mulia",
];

const SEKTOR = [
  "Kimia", "Tekstil", "Farmasi", "Otomotif", "Semen", "Baja", "Plastik",
  "Kertas", "Pangan", "Energi", "Logistik", "Properti", "Elektronik",
  "Perkebunan", "Pertambangan", "Manufaktur", "Petrokimia", "Keramik",
];

const KOTA: Array<[string, string]> = [
  ["Bekasi", "Jawa Barat"],
  ["Cikarang", "Jawa Barat"],
  ["Karawang", "Jawa Barat"],
  ["Bogor", "Jawa Barat"],
  ["Bandung", "Jawa Barat"],
  ["Jakarta Utara", "DKI Jakarta"],
  ["Jakarta Timur", "DKI Jakarta"],
  ["Tangerang", "Banten"],
  ["Serang", "Banten"],
  ["Cilegon", "Banten"],
  ["Semarang", "Jawa Tengah"],
  ["Surabaya", "Jawa Timur"],
  ["Gresik", "Jawa Timur"],
  ["Sidoarjo", "Jawa Timur"],
  ["Medan", "Sumatera Utara"],
  ["Palembang", "Sumatera Selatan"],
  ["Balikpapan", "Kalimantan Timur"],
  ["Makassar", "Sulawesi Selatan"],
];

const NAMA_DEPAN = [
  "Budi", "Siti", "Andi", "Rina", "Dewi", "Agus", "Wati", "Joko", "Lia",
  "Rudi", "Sari", "Hendra", "Nur", "Bayu", "Indah", "Fajar", "Ratna",
  "Dimas", "Putri", "Yoga", "Anisa", "Reza", "Maya", "Arif", "Tika",
];

const NAMA_BELAKANG = [
  "Santoso", "Wijaya", "Kusuma", "Pratama", "Hidayat", "Nugroho", "Saputra",
  "Rahayu", "Permana", "Firmansyah", "Handoko", "Maulana", "Setiawan",
  "Puspita", "Gunawan", "Halim", "Wibowo", "Anggraini",
];

/** LCG sederhana agar hasil selalu sama di setiap mesin dan setiap kali dijalankan. */
function createRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function createAdapter() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL belum ada di .env");
  }

  const url = new URL(databaseUrl);

  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace("/", ""),
    connectionLimit: 10,
    connectTimeout: 20000,
    acquireTimeout: 20000,
  });
}

const prisma = new PrismaClient({ adapter: createAdapter() });

function argValue(name: string) {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : null;
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

type DummyCustomer = {
  name: string;
  company: string;
  email: string;
  phone: string;
  contactPerson: string;
  addressLine1: string;
  city: string;
  province: string;
};

function buildCustomers(count: number): DummyCustomer[] {
  const random = createRandom(20260807);
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];

  const seen = new Set<string>();
  const rows: DummyCustomer[] = [];

  // Dibatasi agar tidak berputar selamanya kalau ruang nama sudah habis.
  let attempts = 0;
  const maxAttempts = count * 40;

  while (rows.length < count && attempts < maxAttempts) {
    attempts += 1;

    const badan = pick(BADAN_USAHA);
    const useSektor = random() < 0.45;
    const nama = useSektor
      ? `${badan} ${pick(KATA_1)} ${pick(SEKTOR)} ${pick(KATA_2)}`
      : `${badan} ${pick(KATA_1)} ${pick(KATA_2)}`;

    if (seen.has(nama)) {
      continue;
    }

    seen.add(nama);

    const [city, province] = pick(KOTA);
    const contactPerson = `${pick(NAMA_DEPAN)} ${pick(NAMA_BELAKANG)}`;
    const slug = nama
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.|\.$/g, "");

    rows.push({
      name: nama,
      company: nama,
      email: `${slug}${DUMMY_EMAIL_SUFFIX}`,
      phone: `08${Math.floor(random() * 900000000 + 100000000)}`,
      contactPerson,
      addressLine1: `Jl. Industri Raya No. ${Math.floor(random() * 200) + 1}`,
      city,
      province,
    });
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name, "id"));
}

async function purge() {
  const result = await prisma.customer.deleteMany({
    where: { email: { endsWith: DUMMY_EMAIL_SUFFIX } },
  });

  console.log(`Terhapus ${result.count} customer dummy.`);
}

async function main() {
  if (process.env.NODE_ENV === "production" && !hasFlag("force")) {
    throw new Error(
      "Menolak berjalan saat NODE_ENV=production. Tambahkan --force bila memang disengaja."
    );
  }

  if (hasFlag("purge")) {
    await purge();
    return;
  }

  const count = Number(argValue("count") ?? DEFAULT_COUNT);

  if (!Number.isFinite(count) || count < 1) {
    throw new Error(`--count tidak valid: ${argValue("count")}`);
  }

  const rows = buildCustomers(count);

  const existing = await prisma.customer.findMany({
    where: { email: { endsWith: DUMMY_EMAIL_SUFFIX } },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((row) => row.email));

  const toCreate = rows.filter((row) => !existingEmails.has(row.email));

  // Dipecah agar tidak mengirim satu statement raksasa lewat koneksi VPS.
  const chunkSize = 100;
  let created = 0;

  for (let i = 0; i < toCreate.length; i += chunkSize) {
    const chunk = toCreate.slice(i, i + chunkSize);
    await prisma.customer.createMany({ data: chunk });
    created += chunk.length;
    console.log(`  ${created}/${toCreate.length} dibuat...`);
  }

  const total = await prisma.customer.count();

  console.log(`Selesai. ${created} customer dummy baru, total customer ${total}.`);
  console.log(`Hapus kembali dengan: npx tsx scripts/seed-dummy-customers.ts --purge`);
}

main()
  .catch((error) => {
    console.error("Gagal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
