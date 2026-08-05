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

  // Zod gap flagged in docs/audit/phase0-attack-surface.md §4:
  // contactSchema.contactMethod has no max length — this is the only
  // unbounded field in the app. Confirmed exploitable: a 20,000-char value
  // is accepted and persisted as 201, not rejected.
  it("BUG: accepts an unbounded contactMethod (no max length in contactSchema)", async () => {
    const huge = "9".repeat(20_000);
    const res = await apiJson(
      "/api/contact",
      { name: unique("Contact"), contactMethod: huge, message: "oversized field probe" },
      {},
      { auth: false }
    );
    // Documents current (buggy) behavior — flip to expect(res.status).toBe(400)
    // once contactSchema.contactMethod gets a .max().
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.contactMethod.length).toBe(20_000);
  });
});
