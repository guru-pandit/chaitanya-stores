import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { SiteJsonLd } from "./SiteJsonLd";
import { getPrimaryShopLocation } from "@/lib/shop-locations";

vi.mock("@/lib/shop-locations", () => ({
  getPrimaryShopLocation: vi.fn(),
}));

const mockGetPrimary = getPrimaryShopLocation as unknown as ReturnType<typeof vi.fn>;

// SiteJsonLd is an async Server Component — call it directly to resolve its
// data fetching, then render the returned JSX (same pattern used elsewhere
// in this repo for async Server Components, e.g. Footer.test.tsx).
async function renderSiteJsonLd() {
  return render(await SiteJsonLd());
}

function readStoreNode(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]');
  expect(script).not.toBeNull();
  const data = JSON.parse(script!.textContent ?? "null");
  return data[0];
}

describe("SiteJsonLd — Store node with full contact info", () => {
  beforeEach(() => {
    mockGetPrimary.mockReset();
    mockGetPrimary.mockResolvedValue({
      id: "loc-1",
      name: "Chaitanya Stores",
      address: "Main Road, Sangmeshwar",
      phone: "+919999999999",
      whatsappNumber: "919999999999",
      email: "shop@example.com",
      isPrimary: true,
    });
  });

  it("includes telephone, email, and a PostalAddress when all are configured", async () => {
    const { container } = await renderSiteJsonLd();
    const store = readStoreNode(container);

    expect(store.telephone).toBe("+919999999999");
    expect(store.email).toBe("shop@example.com");
    expect(store.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "Main Road, Sangmeshwar",
      addressCountry: "IN",
    });
  });

  it("includes a priceRange but no price/lowPrice/highPrice", async () => {
    const { container } = await renderSiteJsonLd();
    const store = readStoreNode(container);

    expect(store.priceRange).toBe("₹₹");
    expect(store.price).toBeUndefined();
    expect(store.lowPrice).toBeUndefined();
    expect(store.highPrice).toBeUndefined();
  });
});

describe("SiteJsonLd — missing contact info (no ShopLocation configured)", () => {
  beforeEach(() => {
    mockGetPrimary.mockReset();
    mockGetPrimary.mockResolvedValue({
      id: null,
      name: "Chaitanya Stores",
      address: "",
      phone: "",
      whatsappNumber: "",
      email: "",
      isPrimary: true,
    });
  });

  it("omits the telephone key entirely rather than emitting an empty string", async () => {
    const { container } = await renderSiteJsonLd();
    const store = readStoreNode(container);

    expect("telephone" in store).toBe(false);
  });

  it("omits the email key entirely rather than emitting an empty string", async () => {
    const { container } = await renderSiteJsonLd();
    const store = readStoreNode(container);

    expect("email" in store).toBe(false);
  });

  it("omits the address key entirely rather than emitting a PostalAddress with an empty streetAddress", async () => {
    const { container } = await renderSiteJsonLd();
    const store = readStoreNode(container);

    expect("address" in store).toBe(false);
  });

  it("never emits the 'Contact details coming soon' placeholder text as structured data", async () => {
    const { container } = await renderSiteJsonLd();
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script!.textContent).not.toContain("coming soon");
  });
});

describe("SiteJsonLd — partial contact info", () => {
  it("includes telephone and email but omits address when only address is missing", async () => {
    mockGetPrimary.mockReset();
    mockGetPrimary.mockResolvedValue({
      id: "loc-1",
      name: "Chaitanya Stores",
      address: "",
      phone: "+919999999999",
      whatsappNumber: "919999999999",
      email: "shop@example.com",
      isPrimary: true,
    });

    const { container } = await renderSiteJsonLd();
    const store = readStoreNode(container);

    expect(store.telephone).toBe("+919999999999");
    expect(store.email).toBe("shop@example.com");
    expect("address" in store).toBe(false);
  });
});
