import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    shopLocation: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  shopLocation: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const validBody = {
  name: "Main Branch",
  address: "123 MG Road, Pune",
  phone: "+919999999999",
  whatsappNumber: "919999999999",
  email: "main@example.com",
  isPrimary: true,
};

const params = Promise.resolve({ id: "loc-1" });

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/shop-locations/loc-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function authed() {
  mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
}

beforeEach(() => {
  mockAuth.mockReset();
  mockPrisma.shopLocation.findUnique.mockReset();
  mockPrisma.shopLocation.update.mockReset();
  mockPrisma.shopLocation.updateMany.mockReset();
  mockPrisma.shopLocation.delete.mockReset();
  mockPrisma.$transaction.mockReset();
});

describe("GET /api/shop-locations/[id]", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(new NextRequest("http://localhost/api/shop-locations/loc-1"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the location doesn't exist", async () => {
    authed();
    mockPrisma.shopLocation.findUnique.mockResolvedValueOnce(null);
    const res = await GET(new NextRequest("http://localhost/api/shop-locations/loc-1"), { params });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/shop-locations/[id]", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await PATCH(patchRequest(validBody), { params });
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    authed();
    const res = await PATCH(patchRequest({ ...validBody, name: "" }), { params });
    expect(res.status).toBe(400);
  });

  it("returns 404 when the location doesn't exist", async () => {
    authed();
    mockPrisma.shopLocation.findUnique.mockResolvedValueOnce(null);
    const res = await PATCH(patchRequest(validBody), { params });
    expect(res.status).toBe(404);
  });

  it("rejects unsetting the current primary without another location taking over (400, no write)", async () => {
    authed();
    mockPrisma.shopLocation.findUnique.mockResolvedValueOnce({ id: "loc-1", isPrimary: true });

    const res = await PATCH(patchRequest({ ...validBody, isPrimary: false }), { params });

    expect(res.status).toBe(400);
    expect(mockPrisma.shopLocation.update).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("allows editing a non-primary location's fields without touching isPrimary elsewhere", async () => {
    authed();
    mockPrisma.shopLocation.findUnique.mockResolvedValueOnce({ id: "loc-1", isPrimary: false });
    mockPrisma.shopLocation.update.mockResolvedValueOnce({ id: "loc-1", isPrimary: false });

    const res = await PATCH(patchRequest({ ...validBody, isPrimary: false }), { params });

    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.shopLocation.update).toHaveBeenCalledWith({
      where: { id: "loc-1" },
      data: { ...validBody, isPrimary: false },
    });
  });

  it("unsets every other location's primary flag inside a transaction when promoting this one", async () => {
    authed();
    mockPrisma.shopLocation.findUnique.mockResolvedValueOnce({ id: "loc-1", isPrimary: false });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue({ id: "loc-1", isPrimary: true });
    mockPrisma.$transaction.mockImplementationOnce(async (fn) =>
      fn({ shopLocation: { updateMany, update } })
    );

    const res = await PATCH(patchRequest(validBody), { params });

    expect(res.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({ data: { isPrimary: false } });
    expect(update).toHaveBeenCalledWith({ where: { id: "loc-1" }, data: validBody });
  });

  // Phase 4 audit findings #12/#13 — same DB-level "exactly one primary"
  // enforcement as POST /api/shop-locations; see that route's test file.
  it.each(["P2002", "P2034"] as const)(
    "translates a %s race inside the promote-to-primary transaction into a clean 409",
    async (code) => {
      authed();
      mockPrisma.shopLocation.findUnique.mockResolvedValueOnce({ id: "loc-1", isPrimary: false });
      mockPrisma.$transaction.mockImplementationOnce(async () => {
        throw new Prisma.PrismaClientKnownRequestError("conflict", {
          code,
          clientVersion: "test",
        });
      });

      const res = await PATCH(patchRequest(validBody), { params });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toMatch(/Another location was set as primary/);
    }
  );
});

describe("DELETE /api/shop-locations/[id]", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await DELETE(new NextRequest("http://localhost/api/shop-locations/loc-1"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the location doesn't exist", async () => {
    authed();
    mockPrisma.shopLocation.findUnique.mockResolvedValueOnce(null);
    const res = await DELETE(new NextRequest("http://localhost/api/shop-locations/loc-1"), { params });
    expect(res.status).toBe(404);
  });

  it("returns 409 and does not delete when the location is primary", async () => {
    authed();
    mockPrisma.shopLocation.findUnique.mockResolvedValueOnce({ id: "loc-1", isPrimary: true });

    const res = await DELETE(new NextRequest("http://localhost/api/shop-locations/loc-1"), { params });

    expect(res.status).toBe(409);
    expect(mockPrisma.shopLocation.delete).not.toHaveBeenCalled();
  });

  it("deletes a non-primary location", async () => {
    authed();
    mockPrisma.shopLocation.findUnique.mockResolvedValueOnce({ id: "loc-1", isPrimary: false });
    mockPrisma.shopLocation.delete.mockResolvedValueOnce({ id: "loc-1" });

    const res = await DELETE(new NextRequest("http://localhost/api/shop-locations/loc-1"), { params });

    expect(res.status).toBe(200);
    expect(mockPrisma.shopLocation.delete).toHaveBeenCalledWith({ where: { id: "loc-1" } });
  });
});
