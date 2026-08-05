import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "./Footer";
import { siteConfig } from "@/lib/site-config";

vi.mock("@/lib/shop-locations", () => ({
  getAllShopLocations: vi.fn().mockResolvedValue([]),
}));

// Footer is an async Server Component — call it directly to resolve its data
// fetching, then render the returned JSX (same pattern used to unit-test
// other async Server Components in this repo).
async function renderFooter() {
  render(await Footer());
}

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
