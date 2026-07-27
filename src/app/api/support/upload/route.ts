import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireApiPermission } from "@/lib/api-permission";
import { isCustomerSession } from "@/lib/support-server";
import {
  MAX_SUPPORT_UPLOAD_BYTES,
  SUPPORT_ALLOWED_MIME_TYPES,
} from "@/lib/support-attachments";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN) {
    return NextResponse.json(
      {
        message:
          "Storage media belum terhubung. Tambahkan Vercel Blob ke project terlebih dahulu.",
      },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as HandleUploadBody;
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = JSON.parse(clientPayload || "{}") as { ticketId?: string };
        if (!payload.ticketId) throw new Error("Ticket wajib dipilih");

        const ticket = await prisma.supportTicket.findUnique({
          where: { id: payload.ticketId },
          select: { customerId: true, status: true },
        });
        if (!ticket || ticket.status === "CLOSED") {
          throw new Error("Ticket tidak aktif");
        }
        if (
          isCustomerSession(session) &&
          (!session.customerId || ticket.customerId !== session.customerId)
        ) {
          throw new Error("Forbidden");
        }
        if (!isCustomerSession(session)) {
          const permission = await requireApiPermission(
            "support.desk",
            "canUpdate"
          );
          if (!permission.allowed) throw new Error("Forbidden");
        }
        if (!pathname.startsWith(`support/${payload.ticketId}/`)) {
          throw new Error("Path upload tidak valid");
        }

        return {
          allowedContentTypes: [...SUPPORT_ALLOWED_MIME_TYPES],
          maximumSizeInBytes: MAX_SUPPORT_UPLOAD_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            ticketId: payload.ticketId,
            userId: session.userId,
          }),
        };
      },
    });
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Upload tidak dapat diproses",
      },
      { status: 400 }
    );
  }
}
