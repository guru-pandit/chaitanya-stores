import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteUploadedImage } from "@/lib/upload";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/upload", async () => {
  const actual = await vi.importActual<typeof import("@/lib/upload")>("@/lib/upload");
  return { ...actual, deleteUploadedImage: vi.fn() };
});
vi.mock("@/lib/prisma", () => ({
  prisma: {
    festivalBanner: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockDeleteUploadedImage = deleteUploadedImage as unknown as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  festivalBanner: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const validBody = {
  label: "Diwali 2026",
  mediaType: "IMAGE",
  mediaPath: "/uploads/diwali.jpg",
  isActive: true,
  startDate: "",
  endDate: "",
};

const params = Promise.resolve({ id: "banner-1" });

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/festival-banners/banner-1", {
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
  mockDeleteUploadedImage.mockReset();
  mockPrisma.festivalBanner.findUnique.mockReset();
  mockPrisma.festivalBanner.update.mockReset();
  mockPrisma.festivalBanner.updateMany.mockReset();
  mockPrisma.festivalBanner.delete.mockReset();
  mockPrisma.$transaction.mockReset();
});

describe("GET /api/festival-banners/[id]", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(new NextRequest("http://localhost/api/festival-banners/banner-1"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the banner doesn't exist", async () => {
    authed();
    mockPrisma.festivalBanner.findUnique.mockResolvedValueOnce(null);
    const res = await GET(new NextRequest("http://localhost/api/festival-banners/banner-1"), { params });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/festival-banners/[id]", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await PATCH(patchRequest(validBody), { params });
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    authed();
    const res = await PATCH(patchRequest({ ...validBody, label: "" }), { params });
    expect(res.status).toBe(400);
  });

  it("returns 404 when the banner doesn't exist", async () => {
    authed();
    mockPrisma.festivalBanner.findUnique.mockResolvedValueOnce(null);
    const res = await PATCH(patchRequest(validBody), { params });
    expect(res.status).toBe(404);
  });

  it("allows deactivating a currently-active banner with no replacement (no guard, unlike ShopLocation)", async () => {
    authed();
    mockPrisma.festivalBanner.findUnique.mockResolvedValueOnce({ id: "banner-1", isActive: true });
    mockPrisma.festivalBanner.update.mockResolvedValueOnce({ id: "banner-1", isActive: false });

    const res = await PATCH(patchRequest({ ...validBody, isActive: false }), { params });

    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.festivalBanner.update).toHaveBeenCalled();
  });

  it("deactivates every other banner inside a transaction when activating this one", async () => {
    authed();
    mockPrisma.festivalBanner.findUnique.mockResolvedValueOnce({ id: "banner-1", isActive: false });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue({ id: "banner-1", isActive: true });
    mockPrisma.$transaction.mockImplementationOnce(async (fn) =>
      fn({ festivalBanner: { updateMany, update } })
    );

    const res = await PATCH(patchRequest(validBody), { params });

    expect(res.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({ data: { isActive: false } });
    expect(update).toHaveBeenCalledWith({
      where: { id: "banner-1" },
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

describe("DELETE /api/festival-banners/[id]", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await DELETE(new NextRequest("http://localhost/api/festival-banners/banner-1"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the banner doesn't exist", async () => {
    authed();
    mockPrisma.festivalBanner.findUnique.mockResolvedValueOnce(null);
    const res = await DELETE(new NextRequest("http://localhost/api/festival-banners/banner-1"), { params });
    expect(res.status).toBe(404);
  });

  it("deletes the image file and the row", async () => {
    authed();
    mockPrisma.festivalBanner.findUnique.mockResolvedValueOnce({
      id: "banner-1",
      mediaPath: "/uploads/diwali.jpg",
    });
    mockDeleteUploadedImage.mockResolvedValueOnce(undefined);
    mockPrisma.festivalBanner.delete.mockResolvedValueOnce({ id: "banner-1" });

    const res = await DELETE(new NextRequest("http://localhost/api/festival-banners/banner-1"), { params });

    expect(res.status).toBe(200);
    expect(deleteUploadedImage).toHaveBeenCalledWith("/uploads/diwali.jpg");
    expect(mockPrisma.festivalBanner.delete).toHaveBeenCalledWith({ where: { id: "banner-1" } });
  });

  it("still deletes the row even if deleting the image file throws", async () => {
    authed();
    mockPrisma.festivalBanner.findUnique.mockResolvedValueOnce({
      id: "banner-1",
      mediaPath: "/uploads/diwali.jpg",
    });
    mockDeleteUploadedImage.mockRejectedValueOnce(new Error("disk error"));
    mockPrisma.festivalBanner.delete.mockResolvedValueOnce({ id: "banner-1" });

    const res = await DELETE(new NextRequest("http://localhost/api/festival-banners/banner-1"), { params });

    expect(res.status).toBe(200);
    expect(mockPrisma.festivalBanner.delete).toHaveBeenCalledWith({ where: { id: "banner-1" } });
  });
});
