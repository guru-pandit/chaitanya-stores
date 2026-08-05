import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { logger } from "@/lib/logger";

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const mockLogger = logger as unknown as { error: ReturnType<typeof vi.fn> };

const validBody = {
  message: "Cannot read properties of undefined",
  stack: "TypeError: ...\n  at Component",
  digest: "1234567890",
  url: "https://example.com/products/foo",
};

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/log-client-error", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/log-client-error", () => {
  beforeEach(() => {
    mockLogger.error.mockReset();
  });

  it("logs the error and returns 204 for a valid body", async () => {
    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(204);
    expect(mockLogger.error).toHaveBeenCalledWith("Client-side error", validBody);
  });

  it("accepts a body without the optional stack/digest fields", async () => {
    const res = await POST(postRequest({ message: "oops", url: "https://example.com/" }));

    expect(res.status).toBe(204);
  });

  it("returns 400 with field errors when message is missing", async () => {
    const res = await POST(postRequest({ url: "https://example.com/" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.fieldErrors.message).toBeDefined();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it("returns a clean 400 on malformed JSON instead of a raw 500", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/log-client-error", {
        method: "POST",
        body: "{bad json",
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(res.status).toBe(400);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });
});
