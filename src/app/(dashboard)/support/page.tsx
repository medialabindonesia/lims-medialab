import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isCustomerSession } from "@/lib/support-server";
import { getActiveFaq, getCustomerTickets } from "@/lib/support-page-data";
import SupportCenterClient from "@/components/support/SupportCenterClient";

export default async function SupportCenterPage() {
  const session = await getSession();

  if (!session) redirect("/login");

  // Support Center adalah area customer. Staf diarahkan ke Support Desk.
  if (!isCustomerSession(session)) {
    redirect("/support/desk");
  }

  if (!session.customerId) {
    return (
      <section className="min-h-screen">
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-800">
          Akun customer Anda belum terhubung ke master customer. Silakan hubungi
          admin.
        </div>
      </section>
    );
  }

  const [faq, tickets] = await Promise.all([
    getActiveFaq(),
    getCustomerTickets(session.customerId),
  ]);

  return (
    <SupportCenterClient
      faq={faq}
      initialTickets={tickets}
      customerId={session.customerId}
    />
  );
}
