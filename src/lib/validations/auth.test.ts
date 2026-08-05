import { describe, it, expect } from "vitest";
import { loginSchema } from "./auth";

const valid = { email: "admin@example.com", password: "correct-horse" };

describe("loginSchema", () => {
  it("accepts a valid email and non-empty password", () => {
    expect(loginSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing email", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { email: _email, ...rest } = valid;
    expect(loginSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const result = loginSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing password", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the field from the parsed object
    const { password: _password, ...rest } = valid;
    expect(loginSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ ...valid, password: "" }).success).toBe(false);
  });

  it("accepts a single-character password (min length is 1, no strength requirement)", () => {
    expect(loginSchema.safeParse({ ...valid, password: "x" }).success).toBe(true);
  });

  it("rejects a non-string password", () => {
    const result = loginSchema.safeParse({ ...valid, password: 12345 });
    expect(result.success).toBe(false);
  });
});
