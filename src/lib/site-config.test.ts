import { describe, it, expect } from "vitest";
import { buildWhatsappLink, buildMailtoLink, buildTelLink, siteConfig } from "./site-config";

describe("buildWhatsappLink", () => {
  it("uses the given number and a generic message with no product name", () => {
    const link = buildWhatsappLink("919999999999");
    expect(link).toBe(
      "https://wa.me/919999999999?text=Hi%2C%20I'd%20like%20to%20know%20more%20about%20your%20products."
    );
  });

  it("pre-fills the product name when given", () => {
    const link = buildWhatsappLink("919999999999", "Sandalwood Agarbatti");
    expect(link).toContain("https://wa.me/919999999999?text=");
    expect(decodeURIComponent(link.split("text=")[1])).toBe(
      'Hi, I\'m interested in "Sandalwood Agarbatti". Could you share more details?'
    );
  });

  it("uses the number passed in, not some other shop's number", () => {
    const link = buildWhatsappLink("911111111111");
    expect(link.startsWith("https://wa.me/911111111111")).toBe(true);
  });
});

describe("buildMailtoLink", () => {
  it("uses the given email and a generic subject/body with no product name", () => {
    const link = buildMailtoLink("shop@example.com");
    expect(link).toContain("mailto:shop@example.com?subject=Product%20Enquiry");
  });

  it("pre-fills subject and body with the product name when given", () => {
    const link = buildMailtoLink("shop@example.com", "Rose Agarbatti");
    expect(link).toContain("subject=Enquiry%3A%20Rose%20Agarbatti");
    expect(decodeURIComponent(link.split("body=")[1])).toBe(
      'Hi, I\'m interested in "Rose Agarbatti". Could you share more details?'
    );
  });
});

describe("buildTelLink", () => {
  it("builds a tel: link from the given phone number", () => {
    expect(buildTelLink("+919999999999")).toBe("tel:+919999999999");
  });
});

describe("siteConfig — product disclaimer & policies", () => {
  it("has a non-empty productDisclaimer string", () => {
    expect(typeof siteConfig.productDisclaimer).toBe("string");
    expect(siteConfig.productDisclaimer.length).toBeGreaterThan(0);
  });

  it("has a non-empty policies array of non-empty strings", () => {
    expect(Array.isArray(siteConfig.policies)).toBe(true);
    expect(siteConfig.policies.length).toBeGreaterThan(0);
    for (const policy of siteConfig.policies) {
      expect(typeof policy).toBe("string");
      expect(policy.length).toBeGreaterThan(0);
    }
  });
});
