import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

export type SessionPayload = {
  userId: string;
  email: string;
  roleId: string;
  roleCode: string;
  customerId?: string | null;
};

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "lims-medialab-secret"
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