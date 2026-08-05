import { describe, it, expect } from "vitest";
import { clientErrorSchema } from "./clientError";

const valid = {
  message: "TypeError: cannot read properties of undefined",
  stack: "at Component (App.tsx:10:5)",
  digest: "1234567890",
  url: "https://example.com/products/sandalwood",
};

describe("clientErrorSchema", () => {
  it("accepts a fully valid payload", () => {
    expect(clientErrorSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts stack/digest omitted (optional)", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { stack: _s, digest: _d, ...rest } = valid;
    expect(clientErrorSchema.safeParse(rest).success).toBe(true);
  });

  it("rejects a missing message", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { message: _m, ...rest } = valid;
    expect(clientErrorSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an empty message", () => {
    expect(clientErrorSchema.safeParse({ ...valid, message: "" }).success).toBe(false);
  });

  it("accepts a message at exactly the 2000-char boundary", () => {
    expect(clientErrorSchema.safeParse({ ...valid, message: "a".repeat(2000) }).success).toBe(true);
  });

  it("rejects a message over the 2000-char boundary", () => {
    expect(clientErrorSchema.safeParse({ ...valid, message: "a".repeat(2001) }).success).toBe(false);
  });

  it("accepts a stack at exactly the 4000-char boundary", () => {
    expect(clientErrorSchema.safeParse({ ...valid, stack: "a".repeat(4000) }).success).toBe(true);
  });

  it("rejects a stack over the 4000-char boundary", () => {
    expect(clientErrorSchema.safeParse({ ...valid, stack: "a".repeat(4001) }).success).toBe(false);
  });

  it("accepts a digest at exactly the 200-char boundary", () => {
    expect(clientErrorSchema.safeParse({ ...valid, digest: "a".repeat(200) }).success).toBe(true);
  });

  it("rejects a digest over the 200-char boundary", () => {
    expect(clientErrorSchema.safeParse({ ...valid, digest: "a".repeat(201) }).success).toBe(false);
  });

  it("rejects a missing url", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { url: _u, ...rest } = valid;
    expect(clientErrorSchema.safeParse(rest).success).toBe(false);
  });

  it("accepts an empty-string url (no min-length constraint on url)", () => {
    expect(clientErrorSchema.safeParse({ ...valid, url: "" }).success).toBe(true);
  });

  it("accepts a url at exactly the 500-char boundary", () => {
    expect(clientErrorSchema.safeParse({ ...valid, url: "a".repeat(500) }).success).toBe(true);
  });

  it("rejects a url over the 500-char boundary", () => {
    expect(clientErrorSchema.safeParse({ ...valid, url: "a".repeat(501) }).success).toBe(false);
  });
});
