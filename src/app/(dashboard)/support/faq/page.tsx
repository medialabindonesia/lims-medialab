import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import FaqAdminClient from "@/components/support/FaqAdminClient";

export default async function FaqManagementPage() {
  const session = await getSession();

  if (!session) redirect("/login");

  const allowed = await canAccessMenu(session.roleId, "support.faq");
  if (!allowed) redirect("/dashboard");

  const [categories, cannedReplies] = await Promise.all([
    prisma.faqCategory.findMany({
      orderBy: { sort: "asc" },
      include: { items: { orderBy: { sort: "asc" } } },
    }),
    prisma.cannedReply.findMany({ orderBy: { sort: "asc" } }),
  ]);

  return (
    <FaqAdminClient
      initialCategories={JSON.parse(JSON.stringify(categories))}
      initialCannedReplies={JSON.parse(JSON.stringify(cannedReplies))}
    />
  );
}
