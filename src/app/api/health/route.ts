import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        version: process.env.APP_VERSION || "unknown",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("HEALTH_CHECK_ERROR", error);

    return NextResponse.json(
      { status: "unavailable" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
