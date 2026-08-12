import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import CustomerImportExcel from "@/components/master/CustomerImportExcel";
import MasterCustomerClient from "@/components/master/MasterCustomerClient";
import ConsultantManager from "@/components/master/ConsultantManager";
import PageHeader from "@/components/layout/PageHeader";

export default async function MasterCustomerPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await canAccessMenu(session.roleId, "master.customers");

  if (!allowed) {
    redirect("/dashboard");
  }

  const customers = await prisma.customer.findMany({
    include: {
      consultant: true,
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
  const consultants = await prisma.consultant.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });

  return (
    <section className="min-h-screen">
      <PageHeader
        eyebrow="Master Data"
        title="Master Customer"
        subtitle="Kelola data customer, billing, lokasi sampling, pengiriman dokumen, email penerima COA, sekaligus akun login customer."
      />

      <ConsultantManager initialConsultants={JSON.parse(JSON.stringify(consultants))} />

      <CustomerImportExcel />

      <MasterCustomerClient
        initialCustomers={JSON.parse(JSON.stringify(customers))}
        consultants={JSON.parse(JSON.stringify(consultants))}
      />
    </section>
  );
}
