"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

function buildSupportLink(pathname: string) {
  const base = "/support";
  const params = new URLSearchParams();

  if (pathname.startsWith("/dashboard/customer/orders/")) {
    const orderId = pathname.split("/").pop() || "";
    if (orderId) {
      params.set("contextType", "ORDER_SAMPLE");
      params.set("contextId", orderId);
      params.set("contextLabel", "Pesanan");
    }
  } else if (pathname.startsWith("/dashboard/coa/preliminary")) {
    params.set("contextType", "RESULT_REVISION");
    params.set("contextLabel", "Preliminary COA");
  } else if (pathname.startsWith("/dashboard/coa/final")) {
    params.set("contextType", "RESULT_REVISION");
    params.set("contextLabel", "Final COA");
  } else if (pathname.startsWith("/dashboard/quotations/request")) {
    params.set("contextType", "QUOTATION");
    params.set("contextLabel", "Request Quotation");
  }

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export default function SupportChatFab() {
  const pathname = usePathname();
  const href = buildSupportLink(pathname || "/");

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex items-end justify-end sm:hidden">
      <Link
        href={href}
        className="pointer-events-auto inline-flex items-center gap-3 rounded-full bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-2xl shadow-emerald-500/25 transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        aria-label="Buka chat Customer Service"
      >
        <MessageCircle size={20} />
        Chat CS
      </Link>
    </div>
  );
}
