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