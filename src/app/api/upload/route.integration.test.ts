// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  apiFetch,
  apiJson,
  pngFile,
  textFileDisguisedAsPng,
  TEST_BASE_URL,
} from "@/test/apiIntegrationHelpers";

describe("POST /api/upload (integration)", () => {
  it("returns 401 without a session", async () => {
    const form = new FormData();
    form.append("file", pngFile());
    const res = await apiFetch("/api/upload", { method: "POST", body: form }, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file is provided", async () => {
    const form = new FormData();
    const res = await apiFetch("/api/upload", { method: "POST", body: form });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("No file provided");
  });

  it("rejects a file whose magic bytes don't match its claimed image/png type", async () => {
    const form = new FormData();
    form.append("file", textFileDisguisedAsPng());
    const res = await apiFetch("/api/upload", { method: "POST", body: form });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/unsupported file type/i);
  });

  it("uploads a real PNG (201, returns /uploads/... path), file is publicly reachable, then DELETE removes it", async () => {
    const form = new FormData();
    form.append("file", pngFile());
    const uploadRes = await apiFetch("/api/upload", { method: "POST", body: form });
    expect(uploadRes.status).toBe(201);
    const { path } = await uploadRes.json();
    expect(path).toMatch(/^\/uploads\/[a-f0-9-]+\.png$/);

    // Orphaned-but-public risk flagged in phase0-attack-surface.md §5: the
    // file is reachable immediately, before ever being attached to a
    // Product/Banner record.
    const publicRes = await fetch(`${TEST_BASE_URL}${path}`);
    expect(publicRes.status).toBe(200);

    const deleteRes = await apiJson("/api/upload", { path }, { method: "DELETE" });
    expect(deleteRes.status).toBe(204);

    const publicAfterDelete = await fetch(`${TEST_BASE_URL}${path}`);
    expect(publicAfterDelete.status).toBe(404);
  });
});

describe("DELETE /api/upload (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiJson(
      "/api/upload",
      { path: "/uploads/x.png" },
      { method: "DELETE" },
      { auth: false }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when no path is provided", async () => {
    const res = await apiJson("/api/upload", {}, { method: "DELETE" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("No path provided");
  });

  it("rejects a path traversal attempt", async () => {
    const res = await apiJson("/api/upload", { path: "/uploads/../../../etc/passwd" }, {
      method: "DELETE",
    });
    expect(res.status).toBe(400);
  });

  it("rejects a path outside /uploads/", async () => {
    const res = await apiJson("/api/upload", { path: "/etc/passwd" }, { method: "DELETE" });
    expect(res.status).toBe(400);
  });

  it("no-ops cleanly (204) deleting a path that never existed under /uploads/", async () => {
    const res = await apiJson("/api/upload", { path: "/uploads/never-existed-abc123.png" }, {
      method: "DELETE",
    });
    expect(res.status).toBe(204);
  });
});
