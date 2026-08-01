import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { supportUploadDir } from "@/lib/support-storage";

export const runtime = "nodejs";

/**
 * Fallback penyaji lampiran untuk `next dev`. Di produksi nginx melayani
 * `/uploads/` langsung dari disk sehingga route ini tidak pernah terpanggil.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await context.params;
  const root = path.resolve(supportUploadDir());
  const target = path.resolve(root, ...segments.map((s) => decodeURIComponent(s)));

  // Tolak path traversal (`..`) yang keluar dari folder upload.
  if (target !== root && !target.startsWith(root + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) return new NextResponse("Not found", { status: 404 });

    const stream = Readable.toWeb(
      createReadStream(target)
    ) as unknown as ReadableStream;

    return new NextResponse(stream, {
      headers: {
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
