import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.roleCode === "SUPER_ADMIN") {
    redirect("/dashboard/admin");
  }

  if (session.roleCode === "CUSTOMER_ENGAGEMENT") {
    redirect("/dashboard/customer");
  }

  if (session.roleCode === "FINANCE_STAFF") {
    redirect("/dashboard/finance");
  }

  if (session.roleCode.includes("LAB")) {
    redirect("/dashboard/lab");
  }

  redirect("/dashboard/worker");
}