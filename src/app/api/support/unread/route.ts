import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { countUnreadForSession } from "@/lib/support-server";

/** Total unread untuk badge sidebar (customer & agent). */
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const count = await countUnreadForSession(session);

  return NextResponse.json({ count });
}
