import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { DELETE } from "./route";
import { auth } from "@/lib/auth";
import { deleteUploadedImage, UploadError } from "@/lib/upload";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/upload", async () => {
  const actual = await vi.importActual<typeof import("@/lib/upload")>("@/lib/upload");
  return { ...actual, deleteUploadedImage: vi.fn() };
});

// `auth` is overloaded (plain session lookup vs. middleware-wrapping form),
// which defeats vi.mocked()'s inference — cast to the simple async-fn shape
// this route actually calls it as.
const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockDeleteUploadedImage = deleteUploadedImage as unknown as ReturnType<typeof vi.fn>;

function deleteRequest(body: unknown) {
  return new NextRequest("http://localhost/api/upload", {
    method: "DELETE",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("DELETE /api/upload", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockDeleteUploadedImage.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await DELETE(deleteRequest({ path: "/uploads/a.jpg" }));

    expect(res.status).toBe(401);
    expect(deleteUploadedImage).not.toHaveBeenCalled();
  });

  it("returns 400 when the body has no path", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);

    const res = await DELETE(deleteRequest({}));

    expect(res.status).toBe(400);
    expect(deleteUploadedImage).not.toHaveBeenCalled();
  });

  it("returns 400 when deleteUploadedImage rejects an invalid path", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
    mockDeleteUploadedImage.mockRejectedValueOnce(new UploadError("Invalid upload path."));

    const res = await DELETE(deleteRequest({ path: "/etc/passwd" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid upload path.");
  });

  it("returns 204 on successful delete", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } } as never);
    mockDeleteUploadedImage.mockResolvedValueOnce(undefined);

    const res = await DELETE(deleteRequest({ path: "/uploads/a.jpg" }));

    expect(res.status).toBe(204);
    expect(deleteUploadedImage).toHaveBeenCalledWith("/uploads/a.jpg");
  });
});
