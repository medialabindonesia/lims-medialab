import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

const schema = z.object({
  name: z.string().trim().min(2),
  company: z.string().trim().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().trim().optional().nullable(),
  contactPerson: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
});
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const permission = await requireApiPermission("master.customers", "canUpdate");
  if (!permission.allowed) return permission.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ message: "Data consultant tidak valid" }, { status: 400 });
  const { id } = await context.params;
  const consultant = await prisma.consultant.update({
    where: { id },
    data: {
      ...parsed.data,
      email: parsed.data.email?.toLowerCase() || null,
      company: parsed.data.company || null,
      phone: parsed.data.phone || null,
      contactPerson: parsed.data.contactPerson || null,
    },
  });
  return NextResponse.json({ message: "Consultant berhasil diperbarui", consultant });
}
