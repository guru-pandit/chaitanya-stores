// @vitest-environment node
import { describe, it, expect } from "vitest";
import { apiFetch } from "@/test/apiIntegrationHelpers";

describe("GET /api/health (integration)", () => {
  it("returns 200 { status: 'ok' } with no auth required", async () => {
    const res = await apiFetch("/api/health", {}, { auth: false });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
