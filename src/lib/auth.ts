import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

export type SessionPayload = {
  userId: string;
  email: string;
  roleId: string;
  roleCode: string;
  customerId?: string | null;
};

const configuredSecret = process.env.JWT_SECRET;

if (
  process.env.NODE_ENV === "production" &&
  (!configuredSecret || configuredSecret.length < 32)
) {
  throw new Error("JWT_SECRET produksi wajib diisi minimal 32 karakter");
}

const secret = new TextEncoder().encode(
  configuredSecret || "lims-medialab-development-secret"
);

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function verifySession(token: string) {
  const verified = await jwtVerify(token, secret);
  return verified.payload as SessionPayload;
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}
