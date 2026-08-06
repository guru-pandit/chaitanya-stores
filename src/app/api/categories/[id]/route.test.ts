import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// This file was missing entirely before the Phase 4 audit-fix commit
// (dff2cd4) even though categories/[id]/route.ts gained a 404 existence
// check ahead of PATCH/DELETE in that commit, and the DELETE guard's
// ordering relative to that check (404 before the "products still
// reference this category" 409) changed. Only a live-DB integration test
// covered any of this, and that suite was never executed in the sandbox
// that authored the change. This file closes that gap with the same
// mocked-Prisma pattern used by the sibling
// src/app/api/categories/route.test.ts.

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    product: {
      count: vi.fn(),
    },
  },
}));

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  category: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  product: {
    count: ReturnType<typeof vi.fn>;
  };
};

const validBody = { name: "Incense", slug: "incense", description: "", image: "" };

const params = Promise.resolve({ id: "cat-1" });

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/categories/cat-1", { headers });
}

function patchRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/categories/cat-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function deleteRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/categories/cat-1", { method: "DELETE", headers });
}

function authed() {
  mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
}

beforeEach(() => {
  mockAuth.mockReset();
  mockPrisma.category.findUnique.mockReset();
  mockPrisma.category.findFirst.mockReset();
  mockPrisma.category.update.mockReset();
  mockPrisma.category.delete.mockReset();
  mockPrisma.product.count.mockReset();
});

describe("GET /api/categories/[id]", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(getRequest(), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the category doesn't exist", async () => {
    authed();
    mockPrisma.category.findUnique.mockResolvedValueOnce(null);
    const res = await GET(getRequest(), { params });
    expect(res.status).toBe(404);
  });

  it("returns the category when it exists", async () => {
    authed();
    mockPrisma.category.findUnique.mockResolvedValueOnce({ id: "cat-1", ...validBody });
    const res = await GET(getRequest(), { params });
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/categories/[id]", () => {
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
    expect(mockPrisma.category.findUnique).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid body", async () => {
    authed();
    const res = await PATCH(patchRequest({ ...validBody, name: "" }), { params });
    expect(res.status).toBe(400);
  });

  it("returns 404 when the category doesn't exist, before checking the slug conflict", async () => {
    authed();
    mockPrisma.category.findUnique.mockResolvedValueOnce(null);

    const res = await PATCH(patchRequest(validBody), { params });

    expect(res.status).toBe(404);
    expect(mockPrisma.category.findFirst).not.toHaveBeenCalled();
  });

  it("returns 409 when the slug pre-check finds a conflict on a different category", async () => {
    authed();
    mockPrisma.category.findUnique.mockResolvedValueOnce({ id: "cat-1" });
    mockPrisma.category.findFirst.mockResolvedValueOnce({ id: "other-category" });

    const res = await PATCH(patchRequest(validBody), { params });

    expect(res.status).toBe(409);
    expect(mockPrisma.category.update).not.toHaveBeenCalled();
  });

  it("updates the category on success", async () => {
    authed();
    mockPrisma.category.findUnique.mockResolvedValueOnce({ id: "cat-1" });
    mockPrisma.category.findFirst.mockResolvedValueOnce(null);
    mockPrisma.category.update.mockResolvedValueOnce({ id: "cat-1", ...validBody });

    const res = await PATCH(patchRequest(validBody), { params });

    expect(res.status).toBe(200);
    expect(mockPrisma.category.update).toHaveBeenCalledWith({
      where: { id: "cat-1" },
      data: validBody,
    });
  });
});

describe("DELETE /api/categories/[id]", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await DELETE(deleteRequest(), { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a cross-origin request (CSRF backstop), before touching the DB", async () => {
    authed();
    const res = await DELETE(deleteRequest({ origin: "https://evil.example.com" }), { params });
    expect(res.status).toBe(403);
    expect(mockPrisma.category.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 (not 409) when the category doesn't exist, even if products reference a stale id", async () => {
    authed();
    mockPrisma.category.findUnique.mockResolvedValueOnce(null);

    const res = await DELETE(deleteRequest(), { params });

    expect(res.status).toBe(404);
    // The existence check must short-circuit before the product-count guard.
    expect(mockPrisma.product.count).not.toHaveBeenCalled();
  });

  it("returns 409 and does not delete when products still reference the category", async () => {
    authed();
    mockPrisma.category.findUnique.mockResolvedValueOnce({ id: "cat-1" });
    mockPrisma.product.count.mockResolvedValueOnce(3);

    const res = await DELETE(deleteRequest(), { params });

    expect(res.status).toBe(409);
    expect(mockPrisma.category.delete).not.toHaveBeenCalled();
  });

  it("deletes the category when it exists and no products reference it", async () => {
    authed();
    mockPrisma.category.findUnique.mockResolvedValueOnce({ id: "cat-1" });
    mockPrisma.product.count.mockResolvedValueOnce(0);
    mockPrisma.category.delete.mockResolvedValueOnce({ id: "cat-1" });

    const res = await DELETE(deleteRequest(), { params });

    expect(res.status).toBe(200);
    expect(mockPrisma.category.delete).toHaveBeenCalledWith({ where: { id: "cat-1" } });
  });
});
