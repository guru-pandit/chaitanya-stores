import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations/contact";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, contactSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const enquiry = await prisma.enquiry.create({ data: parsed.data });
  return NextResponse.json(enquiry, { status: 201 });
}
