import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import * as analytics from "@/lib/analytics";
import { BottomNav } from "./BottomNav";
import { buildWhatsappLink } from "@/lib/site-config";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

beforeEach(() => {
  mockPathname = "/";
});

function activeLabels() {
  return screen
    .getAllByRole("link")
    .filter((el) => el.getAttribute("aria-current") === "page")
    .map((el) => el.textContent?.trim());
}

describe("BottomNav — navigation tabs", () => {
  it("renders the four nav tabs as links inside a Primary nav landmark", () => {
    render(<BottomNav />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    for (const label of ["Home", "Catalog", "About", "Contact"]) {
      expect(within(nav).getByRole("link", { name: label })).toBeInTheDocument();
    }
  });
});

describe("BottomNav — active tab logic", () => {
  it("marks Home active only on the exact '/' route", () => {
    mockPathname = "/";
    render(<BottomNav />);
    expect(activeLabels()).toEqual(["Home"]);
  });

  it("does not mark Home active on a nested route that merely starts with '/'", () => {
    mockPathname = "/about";
    render(<BottomNav />);
    expect(activeLabels()).not.toContain("Home");
    expect(activeLabels()).toEqual(["About"]);
  });

  it("marks Catalog active on /catalog exactly", () => {
    mockPathname = "/catalog";
    render(<BottomNav />);
    expect(activeLabels()).toEqual(["Catalog"]);
  });

  it("marks Catalog active on a product detail route /catalog/[slug]", () => {
    mockPathname = "/catalog/sandalwood-agarbatti";
    render(<BottomNav />);
    expect(activeLabels()).toEqual(["Catalog"]);
  });

  it("marks Catalog active on a /categories/[slug] route via the match list", () => {
    mockPathname = "/categories/agarbatti";
    render(<BottomNav />);
    expect(activeLabels()).toEqual(["Catalog"]);
  });

  it("does not mark Catalog active on an unrelated route with a similar prefix", () => {
    mockPathname = "/catalogue-something";
    render(<BottomNav />);
    expect(activeLabels()).toEqual([]);
  });
});

describe("BottomNav — Enquire (WhatsApp) tab", () => {
  const whatsapp = "919999999999";

  it("renders the Enquire tab with the generic (no product name) wa.me link when a number is configured", () => {
    mockPathname = "/";
    render(<BottomNav whatsappNumber={whatsapp} />);
    const link = screen.getByRole("link", { name: "Enquire on WhatsApp" });
    expect(link).toHaveAttribute("href", buildWhatsappLink(whatsapp));
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("omits the Enquire tab when no WhatsApp number is configured", () => {
    mockPathname = "/";
    render(<BottomNav whatsappNumber={undefined} />);
    expect(screen.queryByRole("link", { name: "Enquire on WhatsApp" })).not.toBeInTheDocument();
  });

  it("omits the Enquire tab when the WhatsApp number is an empty / whitespace string", () => {
    mockPathname = "/";
    render(<BottomNav whatsappNumber="   " />);
    expect(screen.queryByRole("link", { name: "Enquire on WhatsApp" })).not.toBeInTheDocument();
  });

  it("omits the Enquire tab when the WhatsApp number is null", () => {
    mockPathname = "/";
    render(<BottomNav whatsappNumber={null} />);
    expect(screen.queryByRole("link", { name: "Enquire on WhatsApp" })).not.toBeInTheDocument();
  });

  it("suppresses the Enquire tab on product-detail routes (StickyEnquiryBar owns enquiry there)", () => {
    mockPathname = "/catalog/sandalwood-agarbatti";
    render(<BottomNav whatsappNumber={whatsapp} />);
    expect(screen.queryByRole("link", { name: "Enquire on WhatsApp" })).not.toBeInTheDocument();
  });

  it("still shows the Enquire tab on the catalog index (not a product detail route)", () => {
    mockPathname = "/catalog";
    render(<BottomNav whatsappNumber={whatsapp} />);
    expect(screen.getByRole("link", { name: "Enquire on WhatsApp" })).toBeInTheDocument();
  });
});

describe("BottomNav — analytics", () => {
  it("fires click_whatsapp when the centre Enquire button is clicked", () => {
    const spy = vi.spyOn(analytics, "trackWhatsappClick");
    mockPathname = "/about";
    render(<BottomNav whatsappNumber="919999999999" />);
    fireEvent.click(screen.getByRole("link", { name: "Enquire on WhatsApp" }));
    expect(spy).toHaveBeenCalledWith({ sourcePage: "/about" });
    spy.mockRestore();
  });
});
