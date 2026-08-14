import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "./Footer";
import { siteConfig } from "@/lib/site-config";
import { getAllShopLocations } from "@/lib/shop-locations";
import type { ShopLocation } from "@/generated/prisma/client";

vi.mock("@/lib/shop-locations", () => ({
  getAllShopLocations: vi.fn().mockResolvedValue([]),
}));

const mockedGetAllShopLocations = vi.mocked(getAllShopLocations);

function shopLocation(overrides: Partial<ShopLocation> & { id: string }): ShopLocation {
  return {
    name: "Chaitanya Stores",
    address: "Main Road, Sangmeshwar",
    phone: "+919876543210",
    whatsappNumber: "919876543210",
    email: "hello@chaitanyastores.in",
    isPrimary: false,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

// Footer is an async Server Component — call it directly to resolve its data
// fetching, then render the returned JSX (same pattern used to unit-test
// other async Server Components in this repo).
async function renderFooter() {
  render(await Footer());
}

beforeEach(() => {
  mockedGetAllShopLocations.mockResolvedValue([]);
});

describe("Footer — Policies block", () => {
  it("renders a Policies heading", async () => {
    await renderFooter();

    expect(screen.getByText("Policies")).toBeInTheDocument();
  });

  it("renders every policy from siteConfig.policies", async () => {
    await renderFooter();

    const list = screen.getByText("Policies").closest("div")!.querySelector("ul")!;
    expect(list.querySelectorAll("li")).toHaveLength(siteConfig.policies.length);
    for (const policy of siteConfig.policies) {
      expect(screen.getByText(policy)).toBeInTheDocument();
    }
  });
});

describe("Footer — shop contacts block", () => {
  it("lists name, phone and email for every shop location", async () => {
    mockedGetAllShopLocations.mockResolvedValue([
      shopLocation({
        id: "s1",
        name: "Chaitanya Stores — Sangmeshwar",
        phone: "+919876543210",
        email: "sangmeshwar@chaitanyastores.in",
        isPrimary: true,
      }),
      shopLocation({
        id: "s2",
        name: "Chaitanya Stores — Devrukh",
        phone: "+919812345678",
        email: "devrukh@chaitanyastores.in",
      }),
    ]);

    await renderFooter();

    expect(screen.getByText("Chaitanya Stores — Sangmeshwar")).toBeInTheDocument();
    expect(screen.getByText("+919876543210")).toBeInTheDocument();
    expect(screen.getByText("sangmeshwar@chaitanyastores.in")).toBeInTheDocument();

    // The regression this feature fixes: the second shop's phone and email
    // used to be dropped entirely — only the primary shop's were rendered.
    expect(screen.getByText("Chaitanya Stores — Devrukh")).toBeInTheDocument();
    expect(screen.getByText("+919812345678")).toBeInTheDocument();
    expect(screen.getByText("devrukh@chaitanyastores.in")).toBeInTheDocument();
  });

  it('uses the "Our Shops" heading once there is more than one location', async () => {
    mockedGetAllShopLocations.mockResolvedValue([
      shopLocation({ id: "s1", isPrimary: true }),
      shopLocation({ id: "s2", name: "Chaitanya Stores — Devrukh" }),
    ]);

    await renderFooter();

    expect(screen.getByText("Our Shops")).toBeInTheDocument();
  });

  it('keeps the "Reach Us" heading for a single location', async () => {
    mockedGetAllShopLocations.mockResolvedValue([shopLocation({ id: "s1", isPrimary: true })]);

    await renderFooter();

    expect(screen.getByText("Reach Us")).toBeInTheDocument();
    expect(screen.queryByText("Our Shops")).not.toBeInTheDocument();
  });

  it("falls back to the siteConfig details when no shop location exists yet", async () => {
    mockedGetAllShopLocations.mockResolvedValue([]);

    await renderFooter();

    // siteConfig.name also titles the brand column, so assert on the block
    // that carries the address rather than on the name alone.
    expect(screen.getByText(siteConfig.address)).toBeInTheDocument();
  });
});
