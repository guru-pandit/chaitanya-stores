// @vitest-environment node
import { describe, it, expect } from "vitest";
import { apiFetch, apiJson, unique } from "@/test/apiIntegrationHelpers";

describe("POST /api/contact (integration)", () => {
  it("is public — no auth required — and returns 201 with the created Enquiry", async () => {
    const res = await apiJson(
      "/api/contact",
      { name: unique("Contact"), contactMethod: "9999999999", message: "I'd like to enquire." },
      {},
      { auth: false }
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      name: expect.any(String),
      contactMethod: "9999999999",
      message: "I'd like to enquire.",
      isCompleted: false,
    });
    expect(body.id).toBeDefined();
  });

  it("accepts an optional productId", async () => {
    const res = await apiJson(
      "/api/contact",
      {
        productId: "some-product-id",
        name: unique("Contact"),
        contactMethod: "someone@example.com",
        message: "Enquiry with product ref.",
      },
      {},
      { auth: false }
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.productId).toBe("some-product-id");
  });

  it("returns 400 when name is missing", async () => {
    const res = await apiJson(
      "/api/contact",
      { contactMethod: "9999999999", message: "hi" },
      {},
      { auth: false }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.fieldErrors.name).toBeDefined();
  });

  it("returns 400 when contactMethod is missing", async () => {
    const res = await apiJson("/api/contact", { name: "X", message: "hi" }, {}, { auth: false });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.fieldErrors.contactMethod).toBeDefined();
  });

  it("returns 400 when message is missing", async () => {
    const res = await apiJson(
      "/api/contact",
      { name: "X", contactMethod: "9999999999" },
      {},
      { auth: false }
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 on message over the 2000-char cap", async () => {
    const res = await apiJson(
      "/api/contact",
      { name: "X", contactMethod: "9999999999", message: "a".repeat(2001) },
      {},
      { auth: false }
    );
    expect(res.status).toBe(400);
  });

  it("returns a clean 400 (not 500) on malformed JSON", async () => {
    const res = await apiFetch("/api/contact", { method: "POST", body: "{oops" }, { auth: false });
    expect(res.status).toBe(400);
  });

  // Finding #9 fix: contactSchema.contactMethod now has a .max(500) — a
  // 20,000-char value is rejected with a clean 400 field error, not
  // persisted.
  it("rejects an oversized contactMethod (over the 500-char cap)", async () => {
    const huge = "9".repeat(20_000);
    const res = await apiJson(
      "/api/contact",
      { name: unique("Contact"), contactMethod: huge, message: "oversized field probe" },
      {},
      { auth: false }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.fieldErrors.contactMethod).toBeDefined();
  });
});
