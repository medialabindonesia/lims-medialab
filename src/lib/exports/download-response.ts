import { NextResponse } from "next/server";

export function downloadResponse(input: {
  buffer: Buffer;
  contentType: string;
  filename: string;
}) {
  const body = new Uint8Array(input.buffer);

  return new NextResponse(body, {
    headers: {
      "Content-Type": input.contentType,
      "Content-Disposition": `attachment; filename="${input.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Baca query param ?mode=preview dari URL request. */
export function isPreviewMode(request: Request) {
  return new URL(request.url).searchParams.get("mode") === "preview";
}

/**
 * Payload preview PDF: base64 dibungkus JSON (bukan `application/pdf` mentah).
 * Ini sengaja — response dengan Content-Type application/pdf bisa di-intercept
 * oleh extension download-manager pihak ketiga (IDM dkk) yang memonitor SEMUA
 * response jaringan (bukan cuma navigasi/klik unduh), bahkan saat diambil via
 * fetch() biasa. Membungkusnya sebagai JSON membuat response tidak lagi
 * "terlihat" seperti file yang bisa diunduh di lapisan jaringan.
 */
export function pdfPreviewPayload(buffer: Buffer) {
  return { pdfBase64: buffer.toString("base64") };
}