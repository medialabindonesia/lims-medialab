import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import MasterCustomerClient from "@/components/master/MasterCustomerClient";

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
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-600">Master Data</p>
        <h1 className="mt-2 text-4xl font-bold">Master Customer</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Kelola data customer yang nantinya dipakai untuk request quotation,
          pengiriman sample, COA, dan invoice.
        </p>
      </div>

      <MasterCustomerClient initialCustomers={customers} />
    </section>
  );
}