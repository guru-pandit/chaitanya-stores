// @vitest-environment node
import { describe, it, expect } from "vitest";
import { apiFetch, apiJson } from "@/test/apiIntegrationHelpers";

describe("POST /api/log-client-error (integration)", () => {
  it("returns 204 with no auth required, for a valid body", async () => {
    const res = await apiJson(
      "/api/log-client-error",
      { message: "Something broke", url: "/products/foo" },
      {},
      { auth: false }
    );
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
  });

  it("accepts the full optional shape (stack, digest)", async () => {
    const res = await apiJson(
      "/api/log-client-error",
      {
        message: "Something broke",
        stack: "Error: boom\n  at foo (bar.js:1:1)",
        digest: "abc123",
        url: "/products/foo",
      },
      {},
      { auth: false }
    );
    expect(res.status).toBe(204);
  });

  it("returns 400 when message is missing", async () => {
    const res = await apiJson("/api/log-client-error", { url: "/x" }, {}, { auth: false });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 when url is missing", async () => {
    const res = await apiJson("/api/log-client-error", { message: "x" }, {}, { auth: false });
    expect(res.status).toBe(400);
  });

  it("returns a clean 400 (not 500) on malformed JSON", async () => {
    const res = await apiFetch(
      "/api/log-client-error",
      { method: "POST", body: "{not json" },
      { auth: false }
    );
    expect(res.status).toBe(400);
  });

  it("rejects a message over the 2000-char cap with 400", async () => {
    const res = await apiJson(
      "/api/log-client-error",
      { message: "x".repeat(2001), url: "/x" },
      {},
      { auth: false }
    );
    expect(res.status).toBe(400);
  });
});
