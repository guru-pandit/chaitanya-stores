import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";
import { prisma } from "@/lib/prisma";
import { getPrimaryShopLocation } from "@/lib/shop-locations";
import { CONTACT_COMING_SOON } from "@/lib/site-config";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findMany: vi.fn().mockResolvedValue([]) },
    category: { findMany: vi.fn().mockResolvedValue([]) },
    siteSettings: { findFirst: vi.fn().mockResolvedValue(null) },
  },
}));

vi.mock("@/lib/shop-locations", () => ({
  getPrimaryShopLocation: vi.fn(),
}));

const mockGetPrimary = getPrimaryShopLocation as unknown as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  product: { findMany: ReturnType<typeof vi.fn> };
  category: { findMany: ReturnType<typeof vi.fn> };
  siteSettings: { findFirst: ReturnType<typeof vi.fn> };
};

async function renderHome() {
  render(await HomePage());
}

beforeEach(() => {
  mockPrisma.product.findMany.mockResolvedValue([]);
  mockPrisma.category.findMany.mockResolvedValue([]);
  mockPrisma.siteSettings.findFirst.mockResolvedValue(null);
});

describe("HomePage — hero CTA band (WhatsApp vs Get in Touch fallback)", () => {
  it("shows a 'WhatsApp Us' link, not a Contact page link, when a WhatsApp number is configured", async () => {
    mockGetPrimary.mockResolvedValue({
      id: "loc-1",
      whatsappNumber: "919999999999",
      email: "shop@example.com",
      phone: "+919999999999",
      address: "Sangmeshwar, Ratnagiri",
      name: "Chaitanya Stores",
      isPrimary: true,
    });

    await renderHome();

    const whatsappCta = screen.getByRole("link", { name: /whatsapp us/i });
    expect(whatsappCta).toHaveAttribute("href", expect.stringContaining("https://wa.me/919999999999"));
    expect(screen.queryByRole("link", { name: /^get in touch$/i })).not.toBeInTheDocument();
  });

  it("falls back to a 'Get in Touch' link to /contact when no WhatsApp number is configured", async () => {
    mockGetPrimary.mockResolvedValue({
      id: null,
      whatsappNumber: "",
      email: "",
      phone: "",
      address: "",
      name: "Chaitanya Stores",
      isPrimary: true,
    });

    await renderHome();

    expect(screen.queryByRole("link", { name: /whatsapp us/i })).not.toBeInTheDocument();
    const contactLink = screen.getByRole("link", { name: /get in touch/i });
    expect(contactLink).toHaveAttribute("href", "/contact");
  });
});

describe("HomePage — bottom CTA band address fallback", () => {
  it("shows the real address when configured", async () => {
    mockGetPrimary.mockResolvedValue({
      id: "loc-1",
      whatsappNumber: "919999999999",
      email: "shop@example.com",
      phone: "+919999999999",
      address: "Sangmeshwar, Ratnagiri",
      name: "Chaitanya Stores",
      isPrimary: true,
    });

    await renderHome();

    expect(screen.getByText("Sangmeshwar, Ratnagiri")).toBeInTheDocument();
    expect(screen.queryByText(CONTACT_COMING_SOON)).not.toBeInTheDocument();
  });

  it("shows the coming-soon fallback text when no address is configured", async () => {
    mockGetPrimary.mockResolvedValue({
      id: null,
      whatsappNumber: "",
      email: "",
      phone: "",
      address: "",
      name: "Chaitanya Stores",
      isPrimary: true,
    });

    await renderHome();

    // Also appears once as the EnquiryActions fallback note (no contact info
    // at all in this scenario) — assert at least one instance, not exactly one.
    expect(screen.getAllByText(CONTACT_COMING_SOON).length).toBeGreaterThan(0);
  });
});

describe("HomePage — featured products empty state", () => {
  it("shows an EmptyState message when there are no featured products", async () => {
    mockGetPrimary.mockResolvedValue({
      id: null,
      whatsappNumber: "",
      email: "",
      phone: "",
      address: "",
      name: "Chaitanya Stores",
      isPrimary: true,
    });

    await renderHome();

    expect(screen.getByText("No featured products yet")).toBeInTheDocument();
  });
});
