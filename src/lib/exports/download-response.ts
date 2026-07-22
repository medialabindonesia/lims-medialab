import { NextResponse } from "next/server";

export function downloadResponse(input: {
  buffer: Buffer;
  contentType: string;
  filename: string;
  /** "inline" dipakai untuk preview (iframe render native browser); default "attachment" (download). */
  disposition?: "inline" | "attachment";
}) {
  const body = new Uint8Array(input.buffer);
  const disposition = input.disposition ?? "attachment";

  return new NextResponse(body, {
    headers: {
      "Content-Type": input.contentType,
      "Content-Disposition": `${disposition}; filename="${input.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Baca query param ?mode=preview dari URL request. */
export function isPreviewMode(request: Request) {
  return new URL(request.url).searchParams.get("mode") === "preview";
}