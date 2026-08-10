// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { apiJson, unique } from "@/test/apiIntegrationHelpers";

let seededEnquiryId: string;

beforeAll(async () => {
  const contactRes = await apiJson(
    "/api/contact",
    { name: unique("Enquiry Id Test"), contactMethod: "9999999999", message: "probe" },
    {},
    { auth: false }
  );
  seededEnquiryId = (await contactRes.json()).id;
});

describe("PATCH /api/enquiries/[id] (integration)", () => {
  it("returns 401 without a session", async () => {
    const res = await apiJson(
      `/api/enquiries/${seededEnquiryId}`,
      { isCompleted: true },
      { method: "PATCH" },
      { auth: false }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when isCompleted is missing/wrong type", async () => {
    const res = await apiJson(`/api/enquiries/${seededEnquiryId}`, { isCompleted: "yes" }, {
      method: "PATCH",
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 (not 500) for a nonexistent id — correctly guarded", async () => {
    const res = await apiJson(
      "/api/enquiries/does-not-exist-xyz",
      { isCompleted: true },
      { method: "PATCH" }
    );
    expect(res.status).toBe(404);
  });

  it("updates isCompleted and returns the updated Enquiry", async () => {
    const res = await apiJson(
      `/api/enquiries/${seededEnquiryId}`,
      { isCompleted: true },
      { method: "PATCH" }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(seededEnquiryId);
    expect(body.isCompleted).toBe(true);
  });
});
