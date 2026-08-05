import { describe, it, expect } from "vitest";
import { shopLocationSchema } from "./shopLocation";

const valid = {
  name: "Main Branch",
  address: "123 MG Road, Pune",
  phone: "+919999999999",
  whatsappNumber: "919999999999",
  email: "main@example.com",
  isPrimary: false,
};

describe("shopLocationSchema", () => {
  it("accepts a fully valid location", () => {
    expect(shopLocationSchema.safeParse(valid).success).toBe(true);
  });

  it.each(["name", "address", "phone", "whatsappNumber", "email"])(
    "rejects an empty %s",
    (field) => {
      const result = shopLocationSchema.safeParse({ ...valid, [field]: "" });
      expect(result.success).toBe(false);
    }
  );

  it("rejects an invalid email", () => {
    const result = shopLocationSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("requires isPrimary to be a boolean", () => {
    const result = shopLocationSchema.safeParse({ ...valid, isPrimary: "yes" });
    expect(result.success).toBe(false);
  });
});
