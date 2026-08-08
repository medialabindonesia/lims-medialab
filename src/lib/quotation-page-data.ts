import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function getQuotationPageData() {
  const session = await getSession();

  const quotationWhere =
    session?.roleCode === "CUSTOMER_ENGAGEMENT" && session.customerId
      ? {
          customerId: session.customerId,
        }
      : undefined;

  /**
   * Hanya role customer yang daftar customer-nya ikut dikirim, dan itu pun
   * satu baris miliknya sendiri agar bisa dikunci otomatis di form.
   *
   * Untuk sales dan admin daftarnya sengaja dikosongkan: customer Medialab
   * berjumlah ratusan mendekati ribuan, dan sejak form memakai CustomerSelect
   * pencarian sudah dilakukan di server lewat /api/master/customers/search.
   */
  const isCustomerViewer =
    session?.roleCode === "CUSTOMER_ENGAGEMENT" && Boolean(session.customerId);

  /*
   * Daftar parameter dan template COA tidak lagi diambil di sini. Form
   * quotation memuat parameter per regulasi lewat
   * /api/master/regulations/[id]/parameters, dan template COA sudah tidak
   * dipilih sales sama sekali.
   */
  const [customers, quotations] = await Promise.all([
    isCustomerViewer
      ? prisma.customer.findMany({
          where: { id: session!.customerId!, isActive: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),

    prisma.quotation.findMany({
      where: quotationWhere,
      include: {
        customer: true,
        coaTemplate: true,
        items: {
          include: {
            parameter: true,
          },
        },
        // Dipakai untuk label "Jenis uji" dan untuk memuat ulang grup saat
        // quotation dibuka kembali untuk direvisi.
        groups: {
          include: {
            matrix: true,
            regulation: true,
            locations: { orderBy: { sort: "asc" } },
            items: { include: { parameter: true, duration: true } },
          },
          orderBy: { sort: "asc" },
        },
        purchaseOrder: true,
        ltr: true,
        ltrs: {
          include: { items: true },
          orderBy: { sequence: "asc" },
        },
        coc: true,
        cocs: {
          include: { items: true, ltr: true, sample: true },
          orderBy: { sequence: "asc" },
        },
        stps: true,
        invoice: true,
        samples: {
          include: {
            coa: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const quotationIds = quotations.map((quotation) => quotation.id);
  const revisions = quotationIds.length
    ? await prisma.auditRevision.findMany({
        where: { entityType: "QUOTATION", entityId: { in: quotationIds } },
        select: {
          id: true,
          entityId: true,
          revisionNo: true,
          action: true,
          changeSummary: true,
          reason: true,
          actorNameSnapshot: true,
          createdAt: true,
        },
        orderBy: [{ entityId: "asc" }, { revisionNo: "desc" }],
      })
    : [];
  const creatorIds = [...new Set(quotations.map((item) => item.requestedById).filter(Boolean))] as string[];
  const creators = creatorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const revisionMap = new Map<string, typeof revisions>();
  for (const revision of revisions) {
    revisionMap.set(revision.entityId, [
      ...(revisionMap.get(revision.entityId) || []),
      revision,
    ]);
  }
  const creatorMap = new Map(creators.map((creator) => [creator.id, creator]));

  return JSON.parse(JSON.stringify({
    customers,
    quotations: quotations.map((quotation) => ({
      ...quotation,
      requestedBy: quotation.requestedById
        ? creatorMap.get(quotation.requestedById) || null
        : null,
      revisions: revisionMap.get(quotation.id) || [],
    })),
  }));
}
