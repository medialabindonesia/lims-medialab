import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { signSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email dan password wajib diisi" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { message: "Email atau kata sandi tidak sesuai" },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { message: "Email atau kata sandi tidak sesuai" },
        { status: 401 }
      );
    }

    const token = await signSession({
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleCode: user.role.code,
      customerId: user.customerId,
    });

    const cookieStore = await cookies();

    cookieStore.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    let redirectTo = "/dashboard/worker";

    if (user.role.code === "SUPER_ADMIN") redirectTo = "/dashboard/admin";
    if (user.role.code === "CUSTOMER_ENGAGEMENT") redirectTo = "/dashboard/customer";
    if (user.role.code === "FINANCE_STAFF") redirectTo = "/dashboard/finance";
    if (user.role.code.includes("LAB")) redirectTo = "/dashboard/lab";

    return NextResponse.json({
      message: "Login berhasil",
      redirectTo,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
      },
    });
  } catch (error) {
    console.error("[auth/login] Authentication service error", error);

    const errorMessage =
      error instanceof Error
        ? `${error.message} ${String(error.cause || "")}`
        : String(error);
    const databaseUnavailable =
      /pool timeout|connect (?:EACCES|ETIMEDOUT|ECONNREFUSED)|P1001/i.test(
        errorMessage
      );

    return NextResponse.json(
      {
        message: databaseUnavailable
          ? "Layanan autentikasi sedang tidak tersedia. Silakan coba beberapa saat lagi."
          : "Login belum dapat diproses. Silakan coba kembali.",
      },
      { status: databaseUnavailable ? 503 : 500 }
    );
  }
}
