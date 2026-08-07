import type { PrismaClient } from "@prisma/client";

/**
 * Master data marketing: matriks, regulasi, parameter per regulasi, dan durasi.
 *
 * SUMBER DATA
 * -----------
 * Seluruh isi berkas ini diturunkan dari surat penawaran resmi Medialab
 * (form MI-FR-MKT-8.2-01.01; Rev.07, 23 September 2024) beserta teks regulasi
 * yang dirujuk di dalamnya. Tidak ada nama parameter atau metode yang dikarang.
 *
 * YANG BELUM ADA
 * --------------
 * 1. Harga dasar (`basePrice`) sengaja dibiarkan null di semua parameter.
 *    Null berarti "belum ditetapkan", bukan gratis. Menunggu price list dari
 *    tim Sales.
 * 2. Baku mutu (`limitValue`) hanya diisi untuk regulasi yang angkanya
 *    tercantum eksplisit dan sudah dipakai di sistem (PP 22/2021 dan
 *    Kep-50/MenLH/11/1996). Sisanya null dan ditandai lewat `note` regulasi
 *    agar diverifikasi Manajer Teknis sebelum dipakai produksi.
 * 3. Cabang matriks Air baru berisi struktur, belum ada regulasi dan parameter,
 *    karena tidak ada satu pun contoh pekerjaan air pada dokumen sumber.
 */

type DurationSeed = {
  code: string;
  label: string;
  minutes: number | null;
  sort: number;
};

const DURATIONS: DurationSeed[] = [
  { code: "GRAB", label: "Grab (Sesaat)", minutes: null, sort: 0 },
  { code: "H1", label: "1 Jam", minutes: 60, sort: 10 },
  { code: "H3", label: "3 Jam", minutes: 180, sort: 20 },
  { code: "H8", label: "8 Jam", minutes: 480, sort: 30 },
  { code: "H24", label: "24 Jam", minutes: 1440, sort: 40 },
  { code: "Y1", label: "1 Tahun", minutes: 525600, sort: 50 },
];

type MatrixSeed = {
  code: string;
  name: string;
  note?: string;
  children?: MatrixSeed[];
};

const MATRICES: MatrixSeed[] = [
  {
    code: "UDARA",
    name: "Udara",
    children: [
      { code: "UDARA_AMBIEN", name: "Udara Ambien" },
      { code: "UDARA_AMBIEN_KEBISINGAN", name: "Udara Ambien - Kebisingan" },
      {
        code: "UDARA_EMISI",
        name: "Emisi Udara Sumber Tidak Bergerak",
        children: [{ code: "UDARA_EMISI_BBG", name: "Bahan Bakar Gas" }],
      },
    ],
  },
  {
    code: "LINGKUNGAN_KERJA",
    name: "Lingkungan Kerja",
    children: [
      { code: "LK_FAKTOR_KIMIA", name: "Faktor Kimia Lingkungan Kerja" },
      { code: "LK_FAKTOR_BIOLOGI", name: "Faktor Biologi Lingkungan Kerja" },
      { code: "LK_FAKTOR_FISIKA", name: "Faktor Fisika Lingkungan Kerja" },
      { code: "LK_ERGONOMI", name: "Asesmen Ergonomi" },
      { code: "LK_PSIKOLOGI", name: "Asesmen Psikologi" },
    ],
  },
  {
    code: "AIR",
    name: "Air",
    note: "Struktur awal. Regulasi dan parameter menunggu master data dari tim Sales.",
    children: [
      {
        code: "AIR_LIMBAH",
        name: "Air Limbah",
        children: [
          { code: "AIR_LIMBAH_INDUSTRI", name: "Limbah Industri" },
          { code: "AIR_LIMBAH_DOMESTIK", name: "Limbah Domestik" },
        ],
      },
      { code: "AIR_PERMUKAAN", name: "Air Permukaan / Sungai" },
      { code: "AIR_LAUT", name: "Air Laut" },
    ],
  },
];

type RegulationParameterSeed = {
  /** Dicocokkan ke AnalysisParameter.name; dibuat bila belum ada. */
  parameterName: string;
  displayName?: string;
  unit?: string | null;
  method: string;
  /** Parameter tidak terakreditasi dicetak dengan tanda * pada surat penawaran. */
  isAccredited?: boolean;
  durations: Array<{
    code: string;
    limitValue?: string;
    isDefault?: boolean;
  }>;
};

type RegulationSeed = {
  code: string;
  name: string;
  shortName?: string;
  note?: string;
  matrixCode: string;
  parameters: RegulationParameterSeed[];
};

const NEEDS_LIMIT_VERIFICATION =
  "Baku mutu per parameter belum diisi. Wajib diverifikasi Manajer Teknis sebelum dipakai produksi.";

const REGULATIONS: RegulationSeed[] = [
  {
    code: "PP22_2021_L7",
    name: "PP RI No. 22 Tahun 2021 Lampiran VII",
    shortName: "PPRi 22/2021 Lamp VII (UA)",
    matrixCode: "UDARA_AMBIEN",
    parameters: [
      {
        parameterName: "Sulfur Dioksida (SO2)",
        displayName: "Sulfur Dioksida (SO₂)",
        unit: "µg/m³",
        method: "MASA 704B Ed 3-1989",
        durations: [
          { code: "H1", limitValue: "150 µg/m³", isDefault: true },
          { code: "H24", limitValue: "75 µg/m³" },
          { code: "Y1", limitValue: "45 µg/m³" },
        ],
      },
      {
        parameterName: "Karbon Monoksida (CO)",
        displayName: "Karbon Monoksida (CO)",
        unit: "µg/m³",
        method: "IKM-UA-7.2.5-MI (Elektrochemical)",
        durations: [
          { code: "H1", limitValue: "10000 µg/m³", isDefault: true },
          { code: "H8", limitValue: "4000 µg/m³" },
        ],
      },
      {
        parameterName: "Nitrogen Dioksida (NO2)",
        displayName: "Nitrogen Dioksida (NO₂)",
        unit: "µg/m³",
        method: "SNI 19-7119.2-2005",
        durations: [
          { code: "H1", limitValue: "200 µg/m³", isDefault: true },
          { code: "H24", limitValue: "65 µg/m³" },
          { code: "Y1", limitValue: "50 µg/m³" },
        ],
      },
      {
        parameterName: "Ozon (O3)",
        displayName: "Oksidan Fotokimia sebagai Ozon (O₃)",
        unit: "µg/m³",
        method: "SNI 19-7119.8-2005",
        durations: [
          { code: "H1", limitValue: "150 µg/m³", isDefault: true },
          { code: "H8", limitValue: "100 µg/m³" },
          { code: "Y1", limitValue: "35 µg/m³" },
        ],
      },
      {
        parameterName: "Hidrokarbon Non Metana (NMHC)",
        displayName: "Hidrokarbon Non Metana (NMHC)",
        unit: "µg/m³",
        method: "IKM-UA-7.2.34-MI Gas Analyzer",
        durations: [{ code: "H3", limitValue: "160 µg/m³", isDefault: true }],
      },
      {
        parameterName: "TSP",
        displayName: "Partikulat Debu < 100 µm (TSP)",
        unit: "µg/m³",
        method: "SNI 7119.3:2017",
        durations: [{ code: "H24", limitValue: "230 µg/m³", isDefault: true }],
      },
      {
        parameterName: "PM10",
        displayName: "Partikulat Debu < 10 µm (PM10)",
        unit: "µg/m³",
        method: "SNI 7119-15-2016",
        durations: [
          { code: "H24", limitValue: "75 µg/m³", isDefault: true },
          { code: "Y1", limitValue: "40 µg/m³" },
        ],
      },
      {
        parameterName: "PM2.5",
        displayName: "Partikulat Debu < 2,5 µm (PM2.5)",
        unit: "µg/m³",
        method: "SNI 7119-14-2016",
        durations: [
          { code: "H24", limitValue: "55 µg/m³", isDefault: true },
          { code: "Y1", limitValue: "15 µg/m³" },
        ],
      },
      {
        parameterName: "Timbal (Pb)",
        displayName: "Timbal (Pb)",
        unit: "µg/m³",
        method: "USEPA Method Compendium IO-3.4",
        durations: [{ code: "H24", limitValue: "2 µg/m³", isDefault: true }],
      },
    ],
  },
  {
    code: "KEP50_1996",
    name: "Kep-50/MenLH/11/1996 tentang Baku Tingkat Kebauan",
    shortName: "Kep-50/MenLH/11/1996",
    matrixCode: "UDARA_AMBIEN",
    parameters: [
      {
        parameterName: "Amonia (NH3)",
        displayName: "Amonia (NH₃)",
        unit: "ppm",
        method: "SNI 19-7119.1-2005",
        durations: [{ code: "H1", limitValue: "2 ppm", isDefault: true }],
      },
      {
        parameterName: "Hidrogen Sulfida (H2S)",
        displayName: "Hidrogen Sulfida (H₂S)",
        unit: "ppm",
        method: "IKM-UA-7.2.33-MI (Spectrophotometry)",
        durations: [{ code: "H1", limitValue: "0,02 ppm", isDefault: true }],
      },
    ],
  },
  {
    code: "KEP48_1996",
    name: "Kep-48/MenLH/11/1996 tentang Baku Tingkat Kebisingan",
    shortName: "Kep-48/MenLH/1996 (UAF)",
    note: "Baku mutu bergantung peruntukan kawasan. Nilai spesifik ditetapkan saat penerbitan CoA.",
    matrixCode: "UDARA_AMBIEN_KEBISINGAN",
    parameters: [
      {
        parameterName: "Kebisingan",
        displayName: "Kebisingan (Noise)",
        unit: "dBA",
        method: "SNI 8427-2017",
        durations: [
          {
            code: "H24",
            limitValue: "Sesuai peruntukan kawasan",
            isDefault: true,
          },
        ],
      },
    ],
  },
  {
    code: "PERMENLH07_2007_L6",
    name: "PermenLH No. 07 Tahun 2007 Lampiran VI (Bahan Bakar Gas)",
    shortName: "PermenLH 07/2007 Lamp VI (UE-N)",
    note: NEEDS_LIMIT_VERIFICATION,
    matrixCode: "UDARA_EMISI_BBG",
    parameters: [
      {
        parameterName: "Sulfur Dioksida (SO2)",
        displayName: "Sulfur Dioksida (SO₂)",
        unit: "mg/Nm³",
        method: "IKM-UE-7.2.2-MI (Gas Analyzer)",
        durations: [{ code: "GRAB", isDefault: true }],
      },
      {
        parameterName: "Nitrogen Dioksida (NO2)",
        displayName: "Nitrogen Dioksida (NO₂)",
        unit: "mg/Nm³",
        method: "IKM-UE-7.2.1-MI (Gas Analyzer)",
        durations: [{ code: "GRAB", isDefault: true }],
      },
      {
        parameterName: "Kecepatan Alir Gas (Velocity)",
        displayName: "Kecepatan Alir Gas (Velocity)",
        unit: "m/s",
        method: "Direct Reading",
        // Ditandai * pada surat penawaran resmi = tidak terakreditasi.
        isAccredited: false,
        durations: [{ code: "GRAB", isDefault: true }],
      },
      {
        parameterName: "Oksigen (O2)",
        displayName: "Oksigen (O₂)",
        unit: "%",
        method: "IKM-UE-7.2.9-MI (Gas Analyzer)",
        durations: [{ code: "GRAB", isDefault: true }],
      },
    ],
  },
  {
    code: "PERMENAKER05_2018_ULK",
    name: "Permenaker No. 5 Tahun 2018 - Faktor Kimia",
    shortName: "Permenaker 5/2018 (ULK)",
    note: NEEDS_LIMIT_VERIFICATION,
    matrixCode: "LK_FAKTOR_KIMIA",
    parameters: [
      {
        parameterName: "Karbon Monoksida (CO)",
        unit: "ppm",
        method: "NIOSH 6604",
        durations: [{ code: "H8", isDefault: true }],
      },
      {
        parameterName: "Nitrogen Dioksida (NO2)",
        unit: "ppm",
        method: "IKM-UA-7.2.27-MI (Spektrofotometri)",
        durations: [{ code: "H8", isDefault: true }],
      },
      {
        parameterName: "Sulfur Dioksida (SO2)",
        unit: "ppm",
        method: "IKM-UA-7.2.6-MI (Spektrofotometri)",
        durations: [{ code: "H8", isDefault: true }],
      },
      {
        parameterName: "Hidrogen Sulfida (H2S)",
        unit: "ppm",
        method: "IKM-UA-7.2.38-MI (Spektrofotometri)",
        durations: [{ code: "H8", isDefault: true }],
      },
      {
        parameterName: "Debu Total",
        unit: "mg/m³",
        method: "SNI 16-7058-2004",
        durations: [{ code: "H8", isDefault: true }],
      },
      {
        parameterName: "Amonia (NH3)",
        unit: "ppm",
        method: "IKM-UA-7.2.23-MI (Spektrofotometri)",
        durations: [{ code: "H8", isDefault: true }],
      },
    ],
  },
  {
    code: "PERMENAKER05_2018_FB",
    name: "Permenaker No. 5 Tahun 2018 - Faktor Biologi",
    shortName: "Permenaker 5/2018 (FB)",
    note: NEEDS_LIMIT_VERIFICATION,
    matrixCode: "LK_FAKTOR_BIOLOGI",
    parameters: [
      {
        parameterName: "Angka Kuman (Total Plate Count)",
        unit: "CFU/m³",
        method: "NIOSH 0800",
        durations: [{ code: "H8", isDefault: true }],
      },
    ],
  },
  {
    code: "PERMENAKER05_2018_FK",
    name: "Permenaker No. 5 Tahun 2018 - Faktor Fisika",
    shortName: "Permenaker 5/2018 (FK)",
    note: "Baku mutu iluminasi bergantung jenis pekerjaan. Wajib diverifikasi Manajer Teknis.",
    matrixCode: "LK_FAKTOR_FISIKA",
    parameters: [
      {
        parameterName: "Kebisingan",
        displayName: "Kebisingan (Noise)",
        unit: "dBA",
        method: "SNI 7231:2009",
        durations: [{ code: "H8", limitValue: "85 dBA", isDefault: true }],
      },
      {
        parameterName: "Iluminasi",
        displayName: "Iluminasi (Pencahayaan)",
        unit: "lux",
        method: "SNI 7062:2019",
        durations: [{ code: "GRAB", isDefault: true }],
      },
    ],
  },
  {
    code: "PERMENAKER05_2018_ERG",
    name: "Permenaker No. 5 Tahun 2018 - Ergonomi",
    shortName: "Permenaker 5/2018 (ERG)",
    matrixCode: "LK_ERGONOMI",
    parameters: [
      {
        parameterName: "Ergonomi",
        unit: null,
        method: "SNI 9011:2021",
        durations: [{ code: "GRAB", isDefault: true }],
      },
    ],
  },
  {
    code: "PERMENAKER05_2018_PSI",
    name: "Permenaker No. 5 Tahun 2018 - Psikologi",
    shortName: "Permenaker 5/2018 (PSI)",
    matrixCode: "LK_PSIKOLOGI",
    parameters: [
      {
        parameterName: "Psikologi",
        unit: null,
        method: "Survei Diagnosis Stress (SDS)",
        durations: [{ code: "GRAB", isDefault: true }],
      },
    ],
  },
];

async function seedDurations(prisma: PrismaClient) {
  const byCode = new Map<string, string>();

  for (const duration of DURATIONS) {
    const row = await prisma.samplingDuration.upsert({
      where: { code: duration.code },
      update: {
        label: duration.label,
        minutes: duration.minutes,
        sort: duration.sort,
        isActive: true,
      },
      create: {
        code: duration.code,
        label: duration.label,
        minutes: duration.minutes,
        sort: duration.sort,
      },
    });

    byCode.set(duration.code, row.id);
  }

  return byCode;
}

async function seedMatrixTree(
  prisma: PrismaClient,
  nodes: MatrixSeed[],
  parentId: string | null,
  byCode: Map<string, string>
) {
  let sort = 0;

  for (const node of nodes) {
    sort += 10;

    const row = await prisma.matrix.upsert({
      where: { code: node.code },
      update: {
        name: node.name,
        note: node.note ?? null,
        parentId,
        sort,
        isActive: true,
      },
      create: {
        code: node.code,
        name: node.name,
        note: node.note ?? null,
        parentId,
        sort,
      },
    });

    byCode.set(node.code, row.id);

    if (node.children?.length) {
      await seedMatrixTree(prisma, node.children, row.id, byCode);
    }
  }

  return byCode;
}

/** Mengambil AnalysisParameter berdasarkan nama, membuatnya bila belum ada. */
async function resolveAnalysisParameter(
  prisma: PrismaClient,
  name: string,
  unit: string | null,
  method: string
) {
  const existing = await prisma.analysisParameter.findFirst({ where: { name } });

  if (existing) {
    return existing;
  }

  // Harga sengaja 0 di sini karena AnalysisParameter.price tidak nullable
  // (kolom milik bersama dengan modul COA, tidak boleh diubah dari sisi
  // marketing). Harga dasar yang sesungguhnya hidup di
  // RegulationParameter.basePrice yang nullable.
  return prisma.analysisParameter.create({
    data: { name, unit, method, price: 0 },
  });
}

async function seedRegulations(
  prisma: PrismaClient,
  matrixByCode: Map<string, string>,
  durationByCode: Map<string, string>
) {
  let regulationCount = 0;
  let parameterCount = 0;

  for (const [index, regulation] of REGULATIONS.entries()) {
    const matrixId = matrixByCode.get(regulation.matrixCode);

    if (!matrixId) {
      throw new Error(
        `Matriks "${regulation.matrixCode}" tidak ditemukan untuk regulasi ${regulation.code}`
      );
    }

    const regulationRow = await prisma.regulation.upsert({
      where: { code: regulation.code },
      update: {
        name: regulation.name,
        shortName: regulation.shortName ?? null,
        note: regulation.note ?? null,
        matrixId,
        sort: (index + 1) * 10,
        isActive: true,
      },
      create: {
        code: regulation.code,
        name: regulation.name,
        shortName: regulation.shortName ?? null,
        note: regulation.note ?? null,
        matrixId,
        sort: (index + 1) * 10,
      },
    });

    regulationCount += 1;

    for (const [paramIndex, param] of regulation.parameters.entries()) {
      const analysisParameter = await resolveAnalysisParameter(
        prisma,
        param.parameterName,
        param.unit ?? null,
        param.method
      );

      const regulationParameter = await prisma.regulationParameter.upsert({
        where: {
          regulationId_parameterId: {
            regulationId: regulationRow.id,
            parameterId: analysisParameter.id,
          },
        },
        update: {
          displayName: param.displayName ?? param.parameterName,
          unit: param.unit ?? null,
          method: param.method,
          isAccredited: param.isAccredited ?? true,
          sort: (paramIndex + 1) * 10,
          isActive: true,
        },
        create: {
          regulationId: regulationRow.id,
          parameterId: analysisParameter.id,
          displayName: param.displayName ?? param.parameterName,
          unit: param.unit ?? null,
          method: param.method,
          isAccredited: param.isAccredited ?? true,
          sort: (paramIndex + 1) * 10,
          // basePrice sengaja dibiarkan null: harga belum ditetapkan.
        },
      });

      parameterCount += 1;

      for (const [durIndex, duration] of param.durations.entries()) {
        const durationId = durationByCode.get(duration.code);

        if (!durationId) {
          throw new Error(
            `Durasi "${duration.code}" tidak dikenal pada ${regulation.code} / ${param.parameterName}`
          );
        }

        await prisma.regulationParameterDuration.upsert({
          where: {
            regulationParameterId_durationId: {
              regulationParameterId: regulationParameter.id,
              durationId,
            },
          },
          update: {
            limitValue: duration.limitValue ?? null,
            isDefault: duration.isDefault ?? false,
            sort: (durIndex + 1) * 10,
          },
          create: {
            regulationParameterId: regulationParameter.id,
            durationId,
            limitValue: duration.limitValue ?? null,
            isDefault: duration.isDefault ?? false,
            sort: (durIndex + 1) * 10,
          },
        });
      }
    }
  }

  return { regulationCount, parameterCount };
}

export async function seedMarketingMaster(prisma: PrismaClient) {
  const durationByCode = await seedDurations(prisma);
  const matrixByCode = await seedMatrixTree(prisma, MATRICES, null, new Map());
  const { regulationCount, parameterCount } = await seedRegulations(
    prisma,
    matrixByCode,
    durationByCode
  );

  console.log(
    `Master marketing: ${matrixByCode.size} matriks, ${regulationCount} regulasi, ` +
      `${parameterCount} parameter-regulasi, ${durationByCode.size} durasi.`
  );
  console.log(
    "Harga dasar masih kosong di seluruh parameter (menunggu price list Sales)."
  );
}
