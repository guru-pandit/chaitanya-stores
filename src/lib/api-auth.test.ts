import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAdminSession } from "./api-auth";
import { auth } from "@/lib/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockAuth.mockReset();
});

describe("requireAdminSession", () => {
  it("returns a 401 response when auth() resolves to null", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const result = await requireAdminSession();

    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(401);
      expect(await result.response.json()).toEqual({ error: "Unauthorized" });
    }
  });

  // Locks in the #1 audit fix: a truthy-but-userless session object (e.g. a
  // NextAuth config-error shape) must still be rejected — `if (!session)`
  // alone would have let this through.
  it("returns a 401 response when auth() resolves to a truthy object with no .user", async () => {
    mockAuth.mockResolvedValueOnce({} as never);

    const result = await requireAdminSession();

    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(401);
      expect(await result.response.json()).toEqual({ error: "Unauthorized" });
    }
  });

  it("returns the session when auth() resolves to a session with a user", async () => {
    const session = { user: { id: "admin-1" }, expires: "2099-01-01T00:00:00.000Z" };
    mockAuth.mockResolvedValueOnce(session as never);

    const result = await requireAdminSession();

    expect("session" in result).toBe(true);
    if ("session" in result) {
      expect(result.session).toEqual(session);
    }
  });
});
