// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  apiFetch,
  apiJson,
  mp4File,
  textFileDisguisedAsMp4,
  pngFile,
  TEST_BASE_URL,
} from "@/test/apiIntegrationHelpers";

describe("POST /api/upload/video (integration)", () => {
  it("returns 401 without a session", async () => {
    const form = new FormData();
    form.append("file", mp4File());
    const res = await apiFetch("/api/upload/video", { method: "POST", body: form }, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file is provided", async () => {
    const form = new FormData();
    const res = await apiFetch("/api/upload/video", { method: "POST", body: form });
    expect(res.status).toBe(400);
  });

  it("rejects a file whose magic bytes don't match its claimed video/mp4 type", async () => {
    const form = new FormData();
    form.append("file", textFileDisguisedAsMp4());
    const res = await apiFetch("/api/upload/video", { method: "POST", body: form });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/unsupported file type/i);
  });

  it("rejects an actual image uploaded to the video endpoint", async () => {
    const form = new FormData();
    form.append("file", pngFile());
    const res = await apiFetch("/api/upload/video", { method: "POST", body: form });
    expect(res.status).toBe(400);
  });

  it("uploads a real MP4 (201, /uploads/....mp4), publicly reachable, cleaned up via DELETE /api/upload", async () => {
    const form = new FormData();
    form.append("file", mp4File());
    const uploadRes = await apiFetch("/api/upload/video", { method: "POST", body: form });
    expect(uploadRes.status).toBe(201);
    const { path } = await uploadRes.json();
    expect(path).toMatch(/^\/uploads\/[a-f0-9-]+\.mp4$/);

    const publicRes = await fetch(`${TEST_BASE_URL}${path}`);
    expect(publicRes.status).toBe(200);

    // Deletion is shared with the image endpoint — DELETE /api/upload only
    // cares about the /uploads/ path, not the file type.
    const deleteRes = await apiJson("/api/upload", { path }, { method: "DELETE" });
    expect(deleteRes.status).toBe(204);

    const publicAfterDelete = await fetch(`${TEST_BASE_URL}${path}`);
    expect(publicAfterDelete.status).toBe(404);
  });
});
