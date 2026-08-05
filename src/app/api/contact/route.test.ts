import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { enquiry: { create: vi.fn() } },
}));

const mockPrisma = prisma as unknown as { enquiry: { create: ReturnType<typeof vi.fn> } };

const validBody = {
  name: "Asha",
  contactMethod: "asha@example.com",
  message: "Do you have sandalwood dhoop in stock?",
};

function postRequest(body: string | object) {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockPrisma.enquiry.create.mockReset();
});

describe("POST /api/contact", () => {
  it("returns 400 on invalid body", async () => {
    const res = await POST(postRequest({ ...validBody, message: "" }));
    expect(res.status).toBe(400);
    expect(mockPrisma.enquiry.create).not.toHaveBeenCalled();
  });

  it("returns a clean 400 on malformed JSON instead of a raw 500 — this endpoint is public/unauthenticated", async () => {
    const res = await POST(postRequest("{bad json"));
    expect(res.status).toBe(400);
    expect(mockPrisma.enquiry.create).not.toHaveBeenCalled();
  });

  it("creates the enquiry and returns 201 on a valid body", async () => {
    mockPrisma.enquiry.create.mockResolvedValueOnce({ id: "1", ...validBody });

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(201);
    expect(mockPrisma.enquiry.create).toHaveBeenCalledWith({ data: validBody });
  });
});
