import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAblyRest, supportChannels } from "@/lib/ably";
import { prisma } from "@/lib/db";
import { isCustomerSession } from "@/lib/support-server";

/**
 * Token auth Ably. Capability di-scope per role supaya customer hanya bisa
 * subscribe/publish di kanal miliknya sendiri, sedangkan agent boleh di semua
 * kanal tiket + kanal desk.
 */
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const rest = getAblyRest();

  if (!rest) {
    return NextResponse.json(
      { message: "Realtime belum dikonfigurasi (ABLY_API_KEY kosong)" },
      { status: 503 }
    );
  }

  const ops = ["subscribe", "publish", "presence"];
  const capability: Record<string, string[]> = {};

  if (isCustomerSession(session)) {
    if (!session.customerId) {
      return NextResponse.json(
        { message: "Customer account belum terhubung ke master customer" },
        { status: 403 }
      );
    }

    capability[supportChannels.customer(session.customerId)] = ops;

    const tickets = await prisma.supportTicket.findMany({
      where: { customerId: session.customerId },
      select: { id: true },
    });

    for (const ticket of tickets) {
      capability[supportChannels.ticket(ticket.id)] = ops;
    }
  } else {
    // Agent / staff: boleh mengakses antrian dan seluruh kanal tiket.
    capability[supportChannels.desk()] = ops;
    capability["support:ticket:*"] = ops;
  }

  try {
    const tokenRequest = await rest.auth.createTokenRequest({
      clientId: session.userId,
      capability: JSON.stringify(capability),
    });

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("[ably-token] gagal buat token", error);
    return NextResponse.json(
      { message: "Gagal membuat token realtime" },
      { status: 500 }
    );
  }
}
