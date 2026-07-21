import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";
import type { TicketIndexEntry } from "@/lib/support";

/**
 * Index ringan untuk pencarian instan di client (TicketSearchBox). Sengaja
 * TIDAK memakai ticketInclude penuh — hanya field yang dibutuhkan tampilan
 * dropdown pencarian, supaya payload kecil dan cepat di-cache di browser.
 * Diambil sekali (bukan per keystroke), lalu difilter di client.
 *
 * Mengabaikan filter status/prioritas/tanggal yang aktif di halaman — ini
 * index global "lompat ke tiket manapun", mirip command palette.
 */
export async function GET() {
  const permission = await requireApiPermission("support.desk", "canView");
  if (!permission.allowed) return permission.response;

  const tickets = await prisma.supportTicket.findMany({
    select: {
      id: true,
      ticketNo: true,
      subject: true,
      status: true,
      createdAt: true,
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const index: TicketIndexEntry[] = tickets.map((t) => ({
    id: t.id,
    ticketNo: t.ticketNo,
    subject: t.subject,
    status: t.status,
    customerName: t.customer?.name ?? null,
    createdAt: t.createdAt.toISOString(),
  }));

  return NextResponse.json({ index });
}
