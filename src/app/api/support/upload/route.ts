import { NextResponse } from "next/server";
import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireApiPermission } from "@/lib/api-permission";
import { isCustomerSession } from "@/lib/support-server";
import {
  MAX_SUPPORT_UPLOAD_BYTES,
  safeSupportFileName,
  SUPPORT_ALLOWED_MIME_TYPES,
} from "@/lib/support-attachments";
import { supportUploadDir, supportUploadUrl } from "@/lib/support-storage";

export const runtime = "nodejs";
// Body di-stream langsung ke disk, jadi jangan biarkan Next mem-buffer response.
export const dynamic = "force-dynamic";

/**
 * Upload lampiran support ke storage lokal VPS.
 *
 * Body request adalah file mentah (bukan multipart) supaya bisa di-stream
 * langsung ke disk — file 250 MB tidak pernah masuk memori. Metadata dikirim
 * lewat query string, mime type lewat header Content-Type.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const ticketId = url.searchParams.get("ticketId");
  const rawName = url.searchParams.get("filename") || "file";
  const contentType = (request.headers.get("content-type") || "").toLowerCase();

  try {
    if (!ticketId) throw new Error("Ticket wajib dipilih");

    if (
      !SUPPORT_ALLOWED_MIME_TYPES.includes(
        contentType as (typeof SUPPORT_ALLOWED_MIME_TYPES)[number]
      )
    ) {
      throw new Error("Format file tidak didukung");
    }

    const declaredSize = Number(request.headers.get("content-length") || 0);
    if (declaredSize > MAX_SUPPORT_UPLOAD_BYTES) {
      throw new Error("Ukuran file melebihi 250 MB");
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
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
      const permission = await requireApiPermission("support.desk", "canUpdate");
      if (!permission.allowed) throw new Error("Forbidden");
    }

    if (!request.body) throw new Error("File kosong");

    // Nama file diberi suffix acak: URL tidak bisa ditebak, dan upload dengan
    // nama sama tidak saling menimpa (perilaku addRandomSuffix sebelumnya).
    const safeTicketId = safeSupportFileName(ticketId);
    const base = safeSupportFileName(rawName) || "file";
    const ext = path.extname(base);
    const stem = ext ? base.slice(0, -ext.length) : base;
    const fileName = `${Date.now()}-${randomBytes(8).toString(
      "hex"
    )}-${stem}${ext}`;

    const dir = path.join(supportUploadDir(), safeTicketId);
    await mkdir(dir, { recursive: true });
    const target = path.join(dir, fileName);

    let written = 0;
    const source = Readable.fromWeb(
      request.body as Parameters<typeof Readable.fromWeb>[0]
    );
    source.on("data", (chunk: Buffer) => {
      written += chunk.length;
      if (written > MAX_SUPPORT_UPLOAD_BYTES) {
        source.destroy(new Error("Ukuran file melebihi 250 MB"));
      }
    });

    try {
      await pipeline(source, createWriteStream(target));
    } catch (error) {
      await unlink(target).catch(() => {});
      throw error;
    }

    if (written === 0) {
      await unlink(target).catch(() => {});
      throw new Error("File kosong");
    }

    const publicUrl = supportUploadUrl(safeTicketId, fileName);
    return NextResponse.json({ url: publicUrl, downloadUrl: publicUrl });
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
