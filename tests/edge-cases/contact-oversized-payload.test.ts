// @vitest-environment node
//
// Phase 1D — contactSchema.contactMethod has no max length (the only
// unbounded field in the app, per Phase 0 §4). This is a public,
// unauthenticated endpoint (POST /api/contact), so an unbounded field
// here is a more attractive abuse target than an admin-only one. Testing
// what actually happens with a very large value: accepted silently,
// rejected, or slow/failed.
import { describe, it, expect } from "vitest";
import { BASE_URL } from "./helpers";

describe("POST /api/contact — contactMethod has no Zod max length", () => {
  it("a 100,000-character contactMethod is accepted (documents current unbounded behavior)", async () => {
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

    // Document whatever actually happens rather than assuming — this is
    // the point of the test. As of this Phase 1D run: contactSchema has
    // no .max() on contactMethod, so a well-formed 100k-char string is
    // expected to pass Zod validation and be written to Postgres
    // (`Enquiry.contactMethod` — check prisma/schema.prisma column type
    // for any DB-level truncation risk if it's ever migrated to a
    // fixed-length type).
    if (res.status === 201) {
      const body = await res.json();
      expect(body.contactMethod.length).toBe(100_000);
    }
    // Whatever happens, it must not be a slow/hanging failure or a raw
    // 500 — either a clean accept (201) or a clean reject (4xx), and
    // reasonably fast.
    expect(res.status).not.toBe(500);
    expect(elapsedMs).toBeLessThan(15_000);
  });

  it("a 1,000,000-character contactMethod — stress the upper end and confirm no server crash", async () => {
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

    expect(res.status).not.toBe(500);
  });
});
