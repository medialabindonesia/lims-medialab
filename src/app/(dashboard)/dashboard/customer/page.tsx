import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getCustomerOrders } from "@/lib/order-tracking";
import PageHeader from "@/components/layout/PageHeader";
import CustomerDashboardClient from "@/components/customer/CustomerDashboardClient";

export default async function CustomerDashboardPage() {
  const session = await getSession();

  const customerId = session?.customerId || undefined;

  // Preliminary COA & Invoice sebelumnya TIDAK di-scope ke customer (bug:
  // menghitung data SELURUH sistem). Sekarang di-scope lewat relasi
  // sample.customerId / quotation.customerId, konsisten dengan pola guard
  // "customerId ? {...} : undefined" yang sudah dipakai di quotation/sample.
  const [quotations, samples, preliminaryCoa, invoices, orders] =
    await Promise.all([
      prisma.quotation.count({
        where: customerId ? { customerId } : undefined,
      }),
      prisma.sample.count({
        where: customerId ? { customerId } : undefined,
      }),
      prisma.coa.count({
        where: {
          type: "PRELIMINARY",
          ...(customerId ? { sample: { customerId } } : {}),
        },
      }),
      prisma.invoice.count({
        where: customerId ? { quotation: { customerId } } : undefined,
      }),
      customerId ? getCustomerOrders(customerId) : Promise.resolve([]),
    ]);

  return (
    <section>
      <PageHeader
        eyebrow="Portal Customer"
        title="Pesanan & Progres Anda"
        subtitle="Pantau setiap pesanan dari penawaran, pengiriman sample, hasil uji, sampai sertifikat dan tagihan."
      />

      <CustomerDashboardClient
        orders={orders}
        counts={{
          quotations,
          samples,
          preliminaryCoa,
          invoices,
        }}
      />
    </section>
  );
}