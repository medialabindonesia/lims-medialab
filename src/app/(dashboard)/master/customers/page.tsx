import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import CustomerImportExcel from "@/components/master/CustomerImportExcel";
import MasterCustomerClient from "@/components/master/MasterCustomerClient";
import ConsultantManager from "@/components/master/ConsultantManager";

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
      <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-600">Master Data</p>

        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
          Master Customer
        </h1>

        <p className="mt-3 max-w-3xl text-slate-500">
          Kelola data customer, billing, lokasi sampling, pengiriman dokumen,
          email penerima COA, sekaligus akun login customer.
        </p>
      </div>

      <ConsultantManager initialConsultants={JSON.parse(JSON.stringify(consultants))} />

      <CustomerImportExcel />

      <MasterCustomerClient
        initialCustomers={JSON.parse(JSON.stringify(customers))}
        consultants={JSON.parse(JSON.stringify(consultants))}
      />
    </section>
  );
}
