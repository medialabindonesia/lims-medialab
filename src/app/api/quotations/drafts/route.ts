import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { quotationChecks } from "@/lib/quotation-access";

/**
 * Simpan otomatis isian form quotation yang belum ditekan Simpan.
 *
 * Draft bersifat PRIBADI: setiap query selalu dibatasi `userId` dari sesi,
 * tidak pernah dari parameter yang dikirim browser. Dengan begitu tidak ada
 * cara membaca atau menimpa draft milik orang lain, bahkan bila id-nya ditebak.
 *
 * Draft juga bukan dokumen resmi — ia tidak memiliki nomor quotation dan tidak
 * pernah muncul di daftar quotation mana pun.
 */

export const runtime = "nodejs";

/** Batas ukuran isian yang wajar untuk satu form quotation. */
const MAX_PAYLOAD_BYTES = 512 * 1024;

/**
 * Penanda form yang sedang diisi: "new" untuk quotation baru, atau id
 * quotation yang sedang direvisi. Dibatasi agar tidak dipakai menyimpan
 * sembarang data.
 *
 * Update: Sekarang mendukung format "new-UUID" untuk menghindari
 * tab-tab bertabrak saat membuat quotation baru.
 */
function normalizeScope(raw: string | null) {
  const value = (raw || "").trim();
  if (!value) return null;
  // Terima "new" lama dan "new-UUID" yang baru
  if (value === "new" || value.startsWith("new-")) return value;
  return /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null;
}

export async function GET(request: Request) {
  const permission = await requireAnyApiPermission(quotationChecks("canView"));
  if (!permission.allowed) return permission.response;

  const scope = normalizeScope(new URL(request.url).searchParams.get("scope"));
  if (!scope) {
    return NextResponse.json({ message: "Scope draft tidak valid" }, { status: 400 });
  }

  const draft = await prisma.quotationDraft.findUnique({
    where: {
      userId_scope: { userId: permission.session!.userId, scope },
    },
    select: { payload: true, updatedAt: true },
  });

  if (!draft) return NextResponse.json({ draft: null });

  let payload: unknown = null;
  try {
    payload = JSON.parse(draft.payload);
  } catch {
    // Draft rusak tidak boleh membuat form gagal dibuka; perlakukan sebagai
    // tidak ada draft dan biarkan tertimpa oleh penyimpanan berikutnya.
    return NextResponse.json({ draft: null });
  }

  return NextResponse.json({
    draft: { payload, updatedAt: draft.updatedAt },
  });
}

export async function PUT(request: Request) {
  const permission = await requireAnyApiPermission(quotationChecks("canView"));
  if (!permission.allowed) return permission.response;

  // Parse body dengan error handling yang jelas
  let body: { scope?: string; payload?: unknown } | null;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { message: "Format JSON tidak valid" },
        { status: 400 },
      );
    }
    // Error lain (request body terlalu besar, dll)
    return NextResponse.json(
      { message: "Gagal membuka request" },
      { status: 400 },
    );
  }

  const scope = normalizeScope(body?.scope ?? null);
  if (!scope) {
    return NextResponse.json({ message: "Scope draft tidak valid" }, { status: 400 });
  }

  if (body?.payload === undefined || body?.payload === null) {
    return NextResponse.json({ message: "Isi draft kosong" }, { status: 400 });
  }

  const serialized = JSON.stringify(body.payload);
  if (Buffer.byteLength(serialized, "utf8") > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { message: "Draft terlalu besar untuk disimpan otomatis" },
      { status: 413 },
    );
  }

  const userId = permission.session!.userId;
  const draft = await prisma.quotationDraft.upsert({
    where: { userId_scope: { userId, scope } },
    create: { userId, scope, payload: serialized },
    update: { payload: serialized },
    select: { updatedAt: true },
  });

  return NextResponse.json({ savedAt: draft.updatedAt });
}

export async function DELETE(request: Request) {
  const permission = await requireAnyApiPermission(quotationChecks("canView"));
  if (!permission.allowed) return permission.response;

  const scope = normalizeScope(new URL(request.url).searchParams.get("scope"));
  if (!scope) {
    return NextResponse.json({ message: "Scope draft tidak valid" }, { status: 400 });
  }

  // deleteMany agar menghapus draft yang memang sudah tidak ada tetap dianggap
  // berhasil — pemanggilnya adalah proses latar yang tidak boleh gagal ramai.
  await prisma.quotationDraft.deleteMany({
    where: { userId: permission.session!.userId, scope },
  });

  return NextResponse.json({ ok: true });
}
