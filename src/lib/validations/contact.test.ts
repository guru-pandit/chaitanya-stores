import { describe, it, expect } from "vitest";
import { contactSchema } from "./contact";

const valid = {
  productId: "prod-1",
  name: "Asha Rao",
  contactMethod: "asha@example.com",
  message: "Do you have this in the 250g pack?",
};

describe("contactSchema", () => {
  it("accepts a fully valid enquiry", () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts productId omitted (optional)", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { productId: _p, ...rest } = valid;
    expect(contactSchema.safeParse(rest).success).toBe(true);
  });

  it("rejects a missing name", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { name: _n, ...rest } = valid;
    expect(contactSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(contactSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("accepts a name at exactly the 150-char boundary", () => {
    expect(contactSchema.safeParse({ ...valid, name: "a".repeat(150) }).success).toBe(true);
  });

  it("rejects a name over the 150-char boundary", () => {
    expect(contactSchema.safeParse({ ...valid, name: "a".repeat(151) }).success).toBe(false);
  });

  it("rejects a missing contactMethod", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { contactMethod: _c, ...rest } = valid;
    expect(contactSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an empty contactMethod", () => {
    expect(contactSchema.safeParse({ ...valid, contactMethod: "" }).success).toBe(false);
  });

  it("accepts an arbitrarily long contactMethod — no max length is enforced (see phase0 audit finding)", () => {
    const result = contactSchema.safeParse({ ...valid, contactMethod: "a".repeat(50_000) });
    expect(result.success).toBe(true);
  });

  it("rejects a missing message", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { message: _m, ...rest } = valid;
    expect(contactSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an empty message", () => {
    expect(contactSchema.safeParse({ ...valid, message: "" }).success).toBe(false);
  });

  it("accepts a message at exactly the 2000-char boundary", () => {
    expect(contactSchema.safeParse({ ...valid, message: "a".repeat(2000) }).success).toBe(true);
  });

  it("rejects a message over the 2000-char boundary", () => {
    expect(contactSchema.safeParse({ ...valid, message: "a".repeat(2001) }).success).toBe(false);
  });
});
