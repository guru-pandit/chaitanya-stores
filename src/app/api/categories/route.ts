import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { verifyCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { categorySchema } from "@/lib/validations/category";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { getPagination } from "@/lib/pagination";
import { fieldError } from "@/lib/fieldError";

export async function GET(req: NextRequest) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const { searchParams } = new URL(req.url);
  const { skip, take } = getPagination(searchParams);

  const [items, total] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
      skip,
      take,
    }),
    prisma.category.count(),
  ]);
  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminSession();
  if ("response" in guard) return guard.response;

  const csrfError = verifyCsrf(req);
  if (csrfError) return csrfError;

  const parsed = await parseJsonBody(req, categorySchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.category.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return NextResponse.json(fieldError("slug", "Slug already in use"), { status: 409 });
  }

  try {
    const category = await prisma.category.create({ data: parsed.data });
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(fieldError("slug", "Slug already in use"), { status: 409 });
    }
    throw err;
  }
}
