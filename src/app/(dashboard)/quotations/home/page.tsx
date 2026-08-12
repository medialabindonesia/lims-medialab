import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getQuotationPageData } from "@/lib/quotation-page-data";
import QuotationHomeClient from "@/components/quotation/QuotationHomeClient";

/**
 * Halaman utama quotation — papan pantau semua status.
 * Diakses oleh siapa saja yang punya akses ke salah satu menu quotation.
 */
export default async function QuotationHomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const hasAccess = await Promise.all([
    canAccessMenu(session.roleId, "quotation.home"),
    canAccessMenu(session.roleId, "quotation.request"),
    canAccessMenu(session.roleId, "quotation.verify"),
    canAccessMenu(session.roleId, "quotation.revise"),
    canAccessMenu(session.roleId, "quotation.approve"),
  ]);

  if (!hasAccess.some(Boolean)) {
    redirect("/dashboard");
  }

  const data = await getQuotationPageData();

  return (
    <section>
      <QuotationHomeClient
        initialQuotations={data.quotations}
        viewerRole={session.roleCode}
      />
    </section>
  );
}
