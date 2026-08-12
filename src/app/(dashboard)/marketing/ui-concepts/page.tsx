import { redirect } from "next/navigation";
import MarketingUiConcepts from "@/components/marketing/MarketingUiConcepts";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";

export default async function MarketingUiConceptsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [canViewMarketing, canCreateQuotation] = await Promise.all([
    canAccessMenu(session.roleId, "marketing.leads"),
    canAccessMenu(session.roleId, "quotation.request"),
  ]);

  if (!canViewMarketing && !canCreateQuotation) redirect("/dashboard");

  return <MarketingUiConcepts />;
}
