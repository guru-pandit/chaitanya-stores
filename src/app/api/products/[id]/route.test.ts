import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// This file was missing entirely before the Phase 4 audit-fix commit
// (dff2cd4) even though products/[id]/route.ts gained substantial new
// logic in that commit: a 404 existence check ahead of PATCH/DELETE, a
// categoryId FK pre-check (400), and P2002/P2003 catch blocks around the
// update transaction. Only a live-DB integration test covered any of this,
// and that suite was never executed in the sandbox that authored the
// change. This file closes that gap with the same mocked-Prisma pattern
// used by the sibling src/app/api/products/route.test.ts.

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  product: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  category: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const validBody = {
  name: "Sandalwood Agarbatti",
  slug: "sandalwood-agarbatti",
  description: "",
  brand: "Cycle",
  weight: "",
  productType: "Masala Sticks",
  sku: "CYC-INC-001",
  price: 12000,
  images: [],
  inStock: true,
  featured: false,
  categoryId: "cat-1",
  variants: [],
};

const params = Promise.resolve({ id: "prod-1" });

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/products/prod-1", { headers });
}

function patchRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/products/prod-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function deleteRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/products/prod-1", { method: "DELETE", headers });
}

function authed() {
  mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
}

beforeEach(() => {
  mockAuth.mockReset();
  mockPrisma.product.findUnique.mockReset();
  mockPrisma.product.findFirst.mockReset();
  mockPrisma.product.delete.mockReset();
  mockPrisma.category.findUnique.mockReset();
  mockPrisma.$transaction.mockReset();
  // Default to "category exists" so PATCH tests that aren't specifically
  // about the categoryId pre-check don't need to know about it.
  mockPrisma.category.findUnique.mockResolvedValue({ id: "cat-1" });
});

describe("GET /api/products/[id]", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(getRequest(), { params });
    expect(res.status).toBe(401);
  });

  it("returns 401 when the session is truthy but has no user", async () => {
    mockAuth.mockResolvedValueOnce({} as never);
    const res = await GET(getRequest(), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the product doesn't exist", async () => {
    authed();
    mockPrisma.product.findUnique.mockResolvedValueOnce(null);
    const res = await GET(getRequest(), { params });
    expect(res.status).toBe(404);
  });

  it("returns the product when it exists", async () => {
    authed();
    mockPrisma.product.findUnique.mockResolvedValueOnce({ id: "prod-1", ...validBody });
    const res = await GET(getRequest(), { params });
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/products/[id]", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await PATCH(patchRequest(validBody), { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a cross-origin request (CSRF backstop), before touching the DB", async () => {
    authed();
    const res = await PATCH(
      patchRequest(validBody, { origin: "https://evil.example.com" }),
      { params }
    );
    expect(res.status).toBe(403);
    expect(mockPrisma.product.findUnique).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid body", async () => {
    authed();
    const res = await PATCH(patchRequest({ ...validBody, sku: "" }), { params });
    expect(res.status).toBe(400);
  });

  it("returns 404 when the product doesn't exist, before checking category/slug/sku", async () => {
    authed();
    mockPrisma.product.findUnique.mockResolvedValueOnce(null);

    const res = await PATCH(patchRequest(validBody), { params });

    expect(res.status).toBe(404);
    expect(mockPrisma.category.findUnique).not.toHaveBeenCalled();
  });

  it("returns 400 when categoryId does not exist", async () => {
    authed();
    mockPrisma.product.findUnique.mockResolvedValueOnce({ id: "prod-1" });
    mockPrisma.category.findUnique.mockReset();
    mockPrisma.category.findUnique.mockResolvedValueOnce(null);

    const res = await PATCH(patchRequest(validBody), { params });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.fieldErrors.categoryId).toEqual(["Category not found"]);
    expect(mockPrisma.product.findFirst).not.toHaveBeenCalled();
  });

  it("returns 409 when the slug pre-check finds a conflict on a different product", async () => {
    authed();
    mockPrisma.product.findUnique.mockResolvedValueOnce({ id: "prod-1" });
    mockPrisma.product.findFirst.mockResolvedValueOnce({ id: "other-product" });

    const res = await PATCH(patchRequest(validBody), { params });

    expect(res.status).toBe(409);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns 409 when the SKU pre-check finds a conflict on a different product", async () => {
    authed();
    mockPrisma.product.findUnique.mockResolvedValueOnce({ id: "prod-1" });
    mockPrisma.product.findFirst
      .mockResolvedValueOnce(null) // slug check passes
      .mockResolvedValueOnce({ id: "other-product" }); // sku check conflicts

    const res = await PATCH(patchRequest(validBody), { params });

    expect(res.status).toBe(409);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("replaces variants and updates the product inside a transaction on success", async () => {
    authed();
    mockPrisma.product.findUnique.mockResolvedValueOnce({ id: "prod-1" });
    mockPrisma.product.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue({ id: "prod-1", ...validBody });
    mockPrisma.$transaction.mockImplementationOnce(async (fn) =>
      fn({ productVariant: { deleteMany }, product: { update } })
    );

    const res = await PATCH(patchRequest(validBody), { params });

    expect(res.status).toBe(200);
    expect(deleteMany).toHaveBeenCalledWith({ where: { productId: "prod-1" } });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "prod-1" } })
    );
  });

  it("translates a P2002 race on the sku column into a clean 409, not a raw 500", async () => {
    authed();
    mockPrisma.product.findUnique.mockResolvedValueOnce({ id: "prod-1" });
    mockPrisma.product.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mockPrisma.$transaction.mockImplementationOnce(async () => {
      throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["sku"] },
      });
    });

    const res = await PATCH(patchRequest(validBody), { params });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.fieldErrors.sku).toEqual(["SKU already in use"]);
  });

  it("translates a P2002 race on the slug column into a clean 409, not a raw 500", async () => {
    authed();
    mockPrisma.product.findUnique.mockResolvedValueOnce({ id: "prod-1" });
    mockPrisma.product.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mockPrisma.$transaction.mockImplementationOnce(async () => {
      throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["slug"] },
      });
    });

    const res = await PATCH(patchRequest(validBody), { params });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.fieldErrors.slug).toEqual(["Slug already in use"]);
  });

  it("translates a P2003 FK race (category deleted mid-request) into a clean 400, not a raw 500", async () => {
    authed();
    mockPrisma.product.findUnique.mockResolvedValueOnce({ id: "prod-1" });
    mockPrisma.product.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mockPrisma.$transaction.mockImplementationOnce(async () => {
      throw new Prisma.PrismaClientKnownRequestError("Foreign key constraint failed", {
        code: "P2003",
        clientVersion: "test",
      });
    });

    const res = await PATCH(patchRequest(validBody), { params });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.fieldErrors.categoryId).toEqual(["Category not found"]);
  });
});

describe("DELETE /api/products/[id]", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await DELETE(deleteRequest(), { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a cross-origin request (CSRF backstop), before touching the DB", async () => {
    authed();
    const res = await DELETE(deleteRequest({ origin: "https://evil.example.com" }), { params });
    expect(res.status).toBe(403);
    expect(mockPrisma.product.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when the product doesn't exist", async () => {
    authed();
    mockPrisma.product.findUnique.mockResolvedValueOnce(null);
    const res = await DELETE(deleteRequest(), { params });
    expect(res.status).toBe(404);
    expect(mockPrisma.product.delete).not.toHaveBeenCalled();
  });

  it("deletes the product when it exists", async () => {
    authed();
    mockPrisma.product.findUnique.mockResolvedValueOnce({ id: "prod-1" });
    mockPrisma.product.delete.mockResolvedValueOnce({ id: "prod-1" });

    const res = await DELETE(deleteRequest(), { params });

    expect(res.status).toBe(200);
    expect(mockPrisma.product.delete).toHaveBeenCalledWith({ where: { id: "prod-1" } });
  });

  it("translates a P2025 race (deleted between the existence check and delete()) into a clean 404", async () => {
    authed();
    mockPrisma.product.findUnique.mockResolvedValueOnce({ id: "prod-1" });
    mockPrisma.product.delete.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Record to delete does not exist", {
        code: "P2025",
        clientVersion: "test",
      })
    );

    const res = await DELETE(deleteRequest(), { params });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });
});
