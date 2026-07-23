import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCustomerOrderDetail } from "@/lib/order-detail";
import OrderDetailClient from "@/components/customer/OrderDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerOrderDetailPage({ params }: PageProps) {
  const session = await getSession();

  if (!session) redirect("/login");
  if (session.roleCode !== "CUSTOMER_ENGAGEMENT") redirect("/dashboard");
  if (!session.customerId) redirect("/dashboard/customer");

  const { id } = await params;
  const detail = await getCustomerOrderDetail(session.customerId, id);

  if (!detail) notFound();

  return <OrderDetailClient detail={detail} />;
}
