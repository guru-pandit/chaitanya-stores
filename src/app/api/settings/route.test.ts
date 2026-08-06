import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// This file was missing entirely before the Phase 4 audit-fix commit
// (dff2cd4), even though this route (the singleton SiteSettings row backing
// homepage hero images) gained the centralized requireAdminSession() guard
// and a CSRF check in that commit, and its heroImages field gained the new
// uploadPathSchema constraint (src/lib/validations/uploadPath.ts) — covered
// at the schema level in src/lib/validations/settings.test.ts, but never
// exercised through the route itself.

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteSettings: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  siteSettings: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const existingSettings = { id: "settings-1", heroImages: "[]", updatedAt: new Date() };

function patchRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/settings", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function authed() {
  mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
}

beforeEach(() => {
  mockAuth.mockReset();
  mockPrisma.siteSettings.findFirst.mockReset();
  mockPrisma.siteSettings.create.mockReset();
  mockPrisma.siteSettings.update.mockReset();
});

describe("GET /api/settings", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockPrisma.siteSettings.findFirst).not.toHaveBeenCalled();
  });

  it("returns 401 when the session is truthy but has no user", async () => {
    mockAuth.mockResolvedValueOnce({} as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the existing settings row when one already exists", async () => {
    authed();
    mockPrisma.siteSettings.findFirst.mockResolvedValueOnce(existingSettings);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(mockPrisma.siteSettings.create).not.toHaveBeenCalled();
  });

  it("creates the singleton row on first read when none exists yet", async () => {
    authed();
    mockPrisma.siteSettings.findFirst.mockResolvedValueOnce(null);
    mockPrisma.siteSettings.create.mockResolvedValueOnce(existingSettings);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(mockPrisma.siteSettings.create).toHaveBeenCalledWith({ data: {} });
  });
});

describe("PATCH /api/settings", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await PATCH(patchRequest({ heroImages: [] }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for a cross-origin request (CSRF backstop), before touching the DB", async () => {
    authed();
    const res = await PATCH(
      patchRequest({ heroImages: [] }, { origin: "https://evil.example.com" })
    );
    expect(res.status).toBe(403);
    expect(mockPrisma.siteSettings.findFirst).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid body (heroImages entry not under /uploads/)", async () => {
    authed();
    const res = await PATCH(
      patchRequest({ heroImages: ["https://evil.example.com/tracker.png"] })
    );
    expect(res.status).toBe(400);
  });

  it("serializes heroImages to JSON and updates the singleton row", async () => {
    authed();
    mockPrisma.siteSettings.findFirst.mockResolvedValueOnce(existingSettings);
    mockPrisma.siteSettings.update.mockResolvedValueOnce({
      ...existingSettings,
      heroImages: '["/uploads/hero-1.jpg"]',
    });

    const res = await PATCH(patchRequest({ heroImages: ["/uploads/hero-1.jpg"] }));

    expect(res.status).toBe(200);
    expect(mockPrisma.siteSettings.update).toHaveBeenCalledWith({
      where: { id: "settings-1" },
      data: { heroImages: '["/uploads/hero-1.jpg"]' },
    });
  });
});
