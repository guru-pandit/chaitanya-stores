import { describe, it, expect } from "vitest";
import { fieldError } from "./fieldError";

describe("fieldError", () => {
  it("wraps a single field/message pair in the same shape Zod's flatten() produces", () => {
    expect(fieldError("slug", "Slug already in use")).toEqual({
      error: { fieldErrors: { slug: ["Slug already in use"] } },
    });
  });
});
