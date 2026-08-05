import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { supportUploadDirCandidates } from "@/lib/support-storage";

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
  const decoded = segments.map((segment) => decodeURIComponent(segment));
  for (const candidate of supportUploadDirCandidates()) {
    const root = path.resolve(candidate);
    const target = path.resolve(root, ...decoded);
    if (target !== root && !target.startsWith(root + path.sep)) continue;
    try {
      const info = await stat(target);
      if (!info.isFile()) continue;
      const stream = Readable.toWeb(createReadStream(target)) as unknown as ReadableStream;
      return new NextResponse(stream, {
        headers: {
          "Content-Length": String(info.size),
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      // Coba kandidat berikutnya.
    }
  }
  return new NextResponse("Not found", { status: 404 });
}
