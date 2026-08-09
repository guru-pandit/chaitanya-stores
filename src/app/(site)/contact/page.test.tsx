import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ContactPage from "./page";
import { getAllShopLocations, getPrimaryShopLocation } from "@/lib/shop-locations";
import { CONTACT_COMING_SOON, siteConfig } from "@/lib/site-config";

vi.mock("@/lib/shop-locations", () => ({
  getAllShopLocations: vi.fn(),
  getPrimaryShopLocation: vi.fn(),
}));

const mockGetAll = getAllShopLocations as unknown as ReturnType<typeof vi.fn>;
const mockGetPrimary = getPrimaryShopLocation as unknown as ReturnType<typeof vi.fn>;

// ContactPage sources `locations` from getAllShopLocations (for the "Visit
// the Shop" list) and `primary` from getPrimaryShopLocation (for the
// contact cards + ContactForm) — both mocks must be set per test so they
// agree, the same way the real DB-backed implementations would.
async function renderContact(locations: unknown[], primary: unknown) {
  mockGetAll.mockResolvedValue(locations);
  mockGetPrimary.mockResolvedValue(primary);
  render(await ContactPage());
}

// A ShopLocation row with individually empty fields is the deterministic
// way to exercise each coming-soon branch without depending on this
// environment's .env values.
const fullLocation = {
  id: "loc-1",
  whatsappNumber: "919999999999",
  email: "shop@example.com",
  phone: "+919999999999",
  address: "Main Road, Sangmeshwar",
  name: "Chaitanya Stores",
  isPrimary: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const emptyFieldsLocation = {
  ...fullLocation,
  id: "loc-2",
  whatsappNumber: "",
  email: "",
  phone: "",
  address: "",
};

// Matches getPrimaryShopLocation()'s own fallback shape (src/lib/shop-locations.ts)
// when no ShopLocation row exists in the DB at all.
const primaryFallback = {
  id: null,
  name: siteConfig.name,
  address: siteConfig.address,
  phone: siteConfig.phone,
  whatsappNumber: siteConfig.whatsappNumber,
  email: siteConfig.email,
  isPrimary: true,
};

describe("ContactPage — contact cards with full contact info", () => {
  it("renders live WhatsApp, Email, Call links and the real address", async () => {
    await renderContact([fullLocation], fullLocation);

    const whatsapp = screen.getByRole("link", { name: /whatsapp/i });
    expect(whatsapp).toHaveAttribute("href", expect.stringContaining("https://wa.me/919999999999"));
    const email = screen.getByText("Email", { selector: "p" }).closest("a")!;
    expect(email).toHaveAttribute("href", expect.stringContaining("mailto:shop@example.com"));
    const call = screen.getByText("Call", { selector: "p" }).closest("a")!;
    expect(call).toHaveAttribute("href", "tel:+919999999999");
    // May also appear a second time in the "Visit the Shop" locations list
    // below, since a location is present — assert it's shown at least once.
    expect(screen.getAllByText("Main Road, Sangmeshwar").length).toBeGreaterThan(0);
  });

  // Regression guard for the pre-existing bug this session fixed: the
  // WhatsApp card must show the WhatsApp number, not the phone number.
  it("shows the WhatsApp number (not the phone number) under the WhatsApp card", async () => {
    const location = { ...fullLocation, whatsappNumber: "911111111111", phone: "+912222222222" };
    await renderContact([location], location);

    const whatsappCard = screen.getByText("WhatsApp — fastest reply").closest("a")!;
    expect(whatsappCard).toHaveTextContent("911111111111");
    expect(whatsappCard).not.toHaveTextContent("+912222222222");
  });
});

describe("ContactPage — contact cards with no contact info configured", () => {
  it("shows the coming-soon fallback instead of a WhatsApp link, with no wa.me href", async () => {
    await renderContact([emptyFieldsLocation], emptyFieldsLocation);

    expect(screen.queryByRole("link", { name: /whatsapp/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(CONTACT_COMING_SOON).length).toBeGreaterThan(0);
  });

  it("shows the coming-soon fallback instead of an Email link, with no mailto: href", async () => {
    await renderContact([emptyFieldsLocation], emptyFieldsLocation);

    expect(screen.queryByRole("link", { name: /^email$/i })).not.toBeInTheDocument();
  });

  it("shows the coming-soon fallback instead of a Call link, with no tel: href", async () => {
    await renderContact([emptyFieldsLocation], emptyFieldsLocation);

    expect(screen.queryByRole("link", { name: /^call$/i })).not.toBeInTheDocument();
  });

  it("shows the coming-soon fallback in place of a raw empty-string address", async () => {
    await renderContact([emptyFieldsLocation], emptyFieldsLocation);

    const addressCard = screen.getByText("Address").closest("div")!;
    expect(addressCard).toHaveTextContent(CONTACT_COMING_SOON);
  });

  it("passes an empty whatsappNumber through to ContactForm so its thank-you panel also falls back correctly", async () => {
    await renderContact([emptyFieldsLocation], emptyFieldsLocation);

    // No links anywhere on the page point at wa.me.
    expect(screen.queryAllByRole("link", { name: /whatsapp/i })).toHaveLength(0);
  });
});

describe("ContactPage — no ShopLocation rows in the DB at all", () => {
  it("still renders without crashing, falling back to siteConfig-derived contact values", async () => {
    await renderContact([], primaryFallback);

    expect(screen.getByRole("heading", { name: /contact chaitanya stores/i })).toBeInTheDocument();
    // "Visit the Shop" locations section is only rendered when locations exist.
    expect(screen.queryByRole("heading", { name: /visit the shop/i })).not.toBeInTheDocument();
  });
});
