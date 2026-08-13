import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { quotationChecks } from "@/lib/quotation-access";

/**
 * Mendapatkan riwayat email untuk sebuah quotation.
 *
 * Endpoint ini memungkinkan user melihat semua email yang pernah
 * dikirim terkait quotation ini, beserta status dan timestamp-nya.
 */
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const permission = await requireAnyApiPermission(quotationChecks("canView"));
  if (!permission.allowed) return permission.response;

  // Validasi quotation ada
  const quotation = await prisma.quotation.findUnique({
    where: { id: params.id },
    select: { id: true },
  });

  if (!quotation) {
    return NextResponse.json(
      { message: "Quotation tidak ditemukan" },
      { status: 404 }
    );
  }

  // Ambil riwayat email
  const emails = await prisma.quotationEmail.findMany({
    where: { quotationId: params.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      toEmail: true,
      ccEmails: true,
      subject: true,
      sentAt: true,
      lastError: true,
      createdAt: true,
      updatedAt: true,
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      sentBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return NextResponse.json({
    quotationId: params.id,
    total: emails.length,
    emails: emails.map((email) => ({
      id: email.id,
      status: email.status,
      toEmail: email.toEmail,
      ccEmails: email.ccEmails,
      subject: email.subject,
      sentAt: email.sentAt,
      lastError: email.lastError,
      createdAt: email.createdAt,
      updatedAt: email.updatedAt,
      createdByName: email.createdBy?.name || null,
      sentByName: email.sentBy?.name || null,
    })),
  });
}
