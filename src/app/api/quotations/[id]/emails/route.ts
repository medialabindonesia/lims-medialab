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

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const permission = await requireAnyApiPermission(quotationChecks("canView"));
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  // Validasi quotation ada
  const quotation = await prisma.quotation.findUnique({
    where: { id },
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
    where: { quotationId: id },
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
    quotationId: id,
    total: emails.length,
    emails: emails.map((email) => ({
      id: email.id,
      status: email.status,
      toEmail: email.toEmail,
      ccEmails: Array.isArray(email.ccEmails) ? email.ccEmails : [],
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
