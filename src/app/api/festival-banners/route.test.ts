import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    festivalBanner: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  festivalBanner: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const validBody = {
  label: "Diwali 2026",
  mediaType: "IMAGE",
  mediaPath: "/uploads/diwali.jpg",
  isActive: false,
  startDate: "",
  endDate: "",
};

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/festival-banners", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function getRequest() {
  return new NextRequest("http://localhost/api/festival-banners");
}

describe("GET /api/festival-banners", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockPrisma.festivalBanner.findMany.mockReset();
    mockPrisma.festivalBanner.count.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
    expect(mockPrisma.festivalBanner.findMany).not.toHaveBeenCalled();
  });

  it("returns a paginated list when authenticated", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
    mockPrisma.festivalBanner.findMany.mockResolvedValueOnce([{ id: "1" }]);
    mockPrisma.festivalBanner.count.mockResolvedValueOnce(1);
    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [{ id: "1" }], total: 1 });
  });
});

describe("POST /api/festival-banners", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockPrisma.festivalBanner.create.mockReset();
    mockPrisma.festivalBanner.updateMany.mockReset();
    mockPrisma.$transaction.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
    const res = await POST(postRequest({ ...validBody, label: "" }));
    expect(res.status).toBe(400);
  });

  it("creates directly, without a transaction, when isActive is false", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
    mockPrisma.festivalBanner.create.mockResolvedValueOnce({ id: "1", isActive: false });

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(201);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.festivalBanner.create).toHaveBeenCalledWith({
      data: {
        label: validBody.label,
        mediaType: validBody.mediaType,
        mediaPath: validBody.mediaPath,
        isActive: false,
        startDate: null,
        endDate: null,
      },
    });
  });

  it("deactivates every other banner inside a transaction when creating an active one", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const create = vi.fn().mockResolvedValue({ id: "1", isActive: true });
    mockPrisma.$transaction.mockImplementationOnce(async (fn) =>
      fn({ festivalBanner: { updateMany, create } })
    );

    const res = await POST(postRequest({ ...validBody, isActive: true }));

    expect(res.status).toBe(201);
    expect(updateMany).toHaveBeenCalledWith({ data: { isActive: false } });
    expect(create).toHaveBeenCalledWith({
      data: {
        label: validBody.label,
        mediaType: validBody.mediaType,
        mediaPath: validBody.mediaPath,
        isActive: true,
        startDate: null,
        endDate: null,
      },
    });
  });
});
