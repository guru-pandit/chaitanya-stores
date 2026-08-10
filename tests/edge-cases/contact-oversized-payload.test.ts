// @vitest-environment node
//
// Phase 1D originally found contactSchema.contactMethod had no max length
// (the only unbounded field in the app, per Phase 0 §4) — a public,
// unauthenticated endpoint (POST /api/contact) accepting a public 100k/1M
// char field is a cheap DB-bloat vector. Phase 4 (finding #9) added
// .max(500) to contactSchema.contactMethod. These tests now confirm an
// oversized payload is rejected cleanly — never accepted, never a raw 500,
// never slow — rather than documenting the old unbounded behavior.
import { describe, it, expect } from "vitest";
import { BASE_URL } from "./helpers";

describe("POST /api/contact — oversized contactMethod is rejected cleanly", () => {
  it("a 100,000-character contactMethod is rejected with a clean 400", async () => {
    const hugeValue = "9".repeat(100_000);
    const payload = {
      name: "Edge Case Tester",
      contactMethod: hugeValue,
      message: "Testing oversized contactMethod field per Phase 0 finding.",
    };

    const start = Date.now();
    const res = await fetch(`${BASE_URL}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const elapsedMs = Date.now() - start;

    console.log(`[contactMethod oversized] status=${res.status} elapsed=${elapsedMs}ms len=${hugeValue.length}`);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.fieldErrors.contactMethod).toBeDefined();
    // Never a slow/hanging failure — rejection happens at Zod validation,
    // well before any DB write is attempted.
    expect(elapsedMs).toBeLessThan(15_000);
  });

  it("a 1,000,000-character contactMethod — stress the upper end and confirm a clean 400, no server crash", async () => {
    const hugeValue = "x".repeat(1_000_000);
    const payload = {
      name: "Edge Case Tester 2",
      contactMethod: hugeValue,
      message: "Testing extreme oversized contactMethod field.",
    };

    const start = Date.now();
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // A network-level failure (e.g. connection reset) here would itself
      // be a finding — surface it clearly rather than letting the test
      // framework report a generic failure.
      throw new Error(`Request failed outright for 1,000,000-char contactMethod: ${String(err)}`);
    }
    const elapsedMs = Date.now() - start;

    console.log(`[contactMethod extreme] status=${res.status} elapsed=${elapsedMs}ms len=${hugeValue.length}`);

    expect(res.status).toBe(400);
  });
});
