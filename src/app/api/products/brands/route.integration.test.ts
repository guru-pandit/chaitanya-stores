// @vitest-environment node
import { describe, it, expect } from "vitest";
import { apiFetch } from "@/test/apiIntegrationHelpers";

describe("GET /api/products/brands (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiFetch("/api/products/brands", {}, { auth: false });
    expect(res.status).toBe(401);
  });

  it("returns a sorted array of distinct brand strings including seeded brands", async () => {
    const res = await apiFetch("/api/products/brands");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toEqual([...body].sort());
    expect(new Set(body).size).toBe(body.length); // distinct
    expect(body).toEqual(expect.arrayContaining(["Cycle", "Satya", "Mangaldeep"]));
  });
});
