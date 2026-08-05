import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateEnquirySchema } from "@/lib/validations/enquiry";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = await parseJsonBody(req, updateEnquirySchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.enquiry.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const enquiry = await prisma.enquiry.update({ where: { id }, data: parsed.data });
  return NextResponse.json(enquiry);
}
