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

describe("shopLocationSchema — mapLink", () => {
  it("accepts mapLink omitted entirely (optional)", () => {
    expect(shopLocationSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an empty string mapLink", () => {
    expect(shopLocationSchema.safeParse({ ...valid, mapLink: "" }).success).toBe(true);
  });

  it("accepts a valid https URL", () => {
    const result = shopLocationSchema.safeParse({
      ...valid,
      mapLink: "https://maps.app.goo.gl/abc123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-URL string", () => {
    const result = shopLocationSchema.safeParse({ ...valid, mapLink: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("rejects a mapLink over the 500-char boundary", () => {
    const longUrl = `https://maps.app.goo.gl/${"a".repeat(500)}`;
    const result = shopLocationSchema.safeParse({ ...valid, mapLink: longUrl });
    expect(result.success).toBe(false);
  });
});

describe("shopLocationSchema — whatsappNumber format", () => {
  it.each(["7776088638", "+919999999999", "91 99999 99999", "91-9999999999", "91999999999a"])(
    "rejects %s (wa.me needs digits only, with country code)",
    (whatsappNumber) => {
      expect(shopLocationSchema.safeParse({ ...valid, whatsappNumber }).success).toBe(false);
    }
  );

  it("accepts a 12-digit number with country code", () => {
    expect(shopLocationSchema.safeParse({ ...valid, whatsappNumber: "917776088638" }).success).toBe(true);
  });
});
