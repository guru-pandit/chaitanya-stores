import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { authorize } from "./auth";
import { prisma } from "@/lib/prisma";
import { isLoginLocked, recordLoginFailure, recordLoginSuccess } from "@/lib/login-throttle";

// auth.ts's module body also calls NextAuth(...) to build the `auth`/
// `handlers`/`signIn`/`signOut` exports — this test only cares about the
// exported `authorize` function, so the real `next-auth` package (which
// pulls in Next.js server internals this jsdom test environment can't
// resolve) is stubbed out rather than exercised.
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({ handlers: {}, signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn() })),
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((config: unknown) => config),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { adminUser: { findUnique: vi.fn() } },
}));

vi.mock("@/lib/login-throttle", () => ({
  isLoginLocked: vi.fn(),
  recordLoginFailure: vi.fn(),
  recordLoginSuccess: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}));

const mockPrisma = prisma as unknown as { adminUser: { findUnique: ReturnType<typeof vi.fn> } };
const mockIsLoginLocked = isLoginLocked as unknown as ReturnType<typeof vi.fn>;
const mockRecordLoginFailure = recordLoginFailure as unknown as ReturnType<typeof vi.fn>;
const mockRecordLoginSuccess = recordLoginSuccess as unknown as ReturnType<typeof vi.fn>;
const mockCompare = bcrypt.compare as unknown as ReturnType<typeof vi.fn>;

const validCredentials = { email: "admin@example.com", password: "correct-password" };

beforeEach(() => {
  mockPrisma.adminUser.findUnique.mockReset();
  mockIsLoginLocked.mockReset().mockReturnValue(false);
  mockRecordLoginFailure.mockReset();
  mockRecordLoginSuccess.mockReset();
  mockCompare.mockReset();
});

describe("authorize", () => {
  it("returns null for a malformed credentials shape without touching the DB", async () => {
    const result = await authorize({ email: "not-an-email" });
    expect(result).toBeNull();
    expect(mockPrisma.adminUser.findUnique).not.toHaveBeenCalled();
  });

  // Low-severity finding (Phase 4 review): the lockout branch skips the DB
  // lookup (that's the point of short-circuiting) but must still run the
  // same dummy bcrypt.compare as the not-found branch below, or a locked-out
  // email would answer measurably faster than every other failure path —
  // a weaker version of the same timing side-channel finding #8 closed.
  it("returns null when the account is locked, running the dummy compare but skipping the DB", async () => {
    mockIsLoginLocked.mockReturnValue(true);
    mockCompare.mockResolvedValueOnce(false);

    const result = await authorize(validCredentials);

    expect(result).toBeNull();
    expect(mockPrisma.adminUser.findUnique).not.toHaveBeenCalled();
    expect(mockCompare).toHaveBeenCalledTimes(1);
    expect(mockCompare).toHaveBeenCalledWith(
      validCredentials.password,
      expect.stringMatching(/^\$2[aby]\$/)
    );
    expect(mockRecordLoginFailure).not.toHaveBeenCalled();
  });

  it("returns null and records a failure when the user doesn't exist", async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValueOnce(null);
    mockCompare.mockResolvedValueOnce(false);

    const result = await authorize(validCredentials);

    expect(result).toBeNull();
    expect(mockRecordLoginFailure).toHaveBeenCalledWith(validCredentials.email);
  });

  // Phase 4 audit finding #8 — timing side-channel: the not-found branch
  // must still run bcrypt.compare (against the dummy hash) so its cost
  // isn't distinguishable from the wrong-password branch.
  it("runs a dummy bcrypt.compare on the not-found branch, discarding the result", async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValueOnce(null);
    mockCompare.mockResolvedValueOnce(true); // even if it "succeeds", auth must still fail

    const result = await authorize(validCredentials);

    expect(result).toBeNull();
    expect(mockCompare).toHaveBeenCalledTimes(1);
    expect(mockCompare).toHaveBeenCalledWith(
      validCredentials.password,
      expect.stringMatching(/^\$2[aby]\$/) // a real bcrypt hash string, not a real user's hash
    );
  });

  it("returns null and records a failure when the password is wrong", async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValueOnce({
      id: "admin-1",
      email: validCredentials.email,
      hashedPassword: "hashed",
    });
    mockCompare.mockResolvedValueOnce(false);

    const result = await authorize(validCredentials);

    expect(result).toBeNull();
    expect(mockRecordLoginFailure).toHaveBeenCalledWith(validCredentials.email);
  });

  it("returns the user and records success on valid credentials", async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValueOnce({
      id: "admin-1",
      email: validCredentials.email,
      hashedPassword: "hashed",
    });
    mockCompare.mockResolvedValueOnce(true);

    const result = await authorize(validCredentials);

    expect(result).toEqual({ id: "admin-1", email: validCredentials.email });
    expect(mockRecordLoginSuccess).toHaveBeenCalledWith(validCredentials.email);
    expect(mockRecordLoginFailure).not.toHaveBeenCalled();
  });

  it("never returns the hashedPassword field", async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValueOnce({
      id: "admin-1",
      email: validCredentials.email,
      hashedPassword: "hashed",
    });
    mockCompare.mockResolvedValueOnce(true);

    const result = await authorize(validCredentials);

    expect(result).not.toHaveProperty("hashedPassword");
  });
});
