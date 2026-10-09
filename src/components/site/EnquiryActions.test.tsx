import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EnquiryActions } from "./EnquiryActions";
import { CONTACT_COMING_SOON } from "@/lib/site-config";
import * as analytics from "@/lib/analytics";

afterEach(() => {
  vi.restoreAllMocks();
});

const full = {
  whatsappNumber: "919999999999",
  email: "shop@example.com",
  phone: "+919999999999",
};

describe("EnquiryActions — happy path", () => {
  it("renders WhatsApp, Email, and Call links with correctly encoded product name", () => {
    render(<EnquiryActions {...full} productName="Sandalwood Agarbatti" />);

    const whatsapp = screen.getByRole("link", { name: /whatsapp/i });
    expect(whatsapp).toHaveAttribute(
      "href",
      "https://wa.me/919999999999?text=Hi%2C%20I'm%20interested%20in%20%22Sandalwood%20Agarbatti%22.%20Could%20you%20share%20more%20details%3F"
    );
    expect(whatsapp).toHaveAttribute("target", "_blank");

    const email = screen.getByRole("link", { name: /email/i });
    expect(email.getAttribute("href")).toContain("mailto:shop@example.com");
    expect(email.getAttribute("href")).toContain("Sandalwood%20Agarbatti");

    const call = screen.getByRole("link", { name: /call/i });
    expect(call).toHaveAttribute("href", "tel:+919999999999");
  });
});

describe("EnquiryActions — partial contact info (per-channel fallback)", () => {
  it("omits the WhatsApp link entirely (no coming-soon note) when whatsappNumber is missing but Email/Call are present", () => {
    render(<EnquiryActions email={full.email} phone={full.phone} whatsappNumber="" />);

    expect(screen.queryByRole("link", { name: /whatsapp/i })).not.toBeInTheDocument();
    expect(screen.queryByText(CONTACT_COMING_SOON)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /call/i })).toBeInTheDocument();
  });

  it("omits the Email link entirely (no broken mailto:) when email is missing", () => {
    render(<EnquiryActions whatsappNumber={full.whatsappNumber} phone={full.phone} email={null} />);

    expect(screen.queryByRole("link", { name: /email/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /whatsapp/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /call/i })).toBeInTheDocument();
  });

  it("omits the Call link entirely (no broken tel:) when phone is missing", () => {
    render(<EnquiryActions whatsappNumber={full.whatsappNumber} email={full.email} phone={undefined} />);

    expect(screen.queryByRole("link", { name: /call/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /whatsapp/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /email/i })).toBeInTheDocument();
  });
});

describe("EnquiryActions — analytics", () => {
  it("fires click_whatsapp with the product name when the WhatsApp link is clicked", () => {
    const spy = vi.spyOn(analytics, "trackWhatsappClick");
    render(<EnquiryActions {...full} productName="Sandalwood Agarbatti" />);

    fireEvent.click(screen.getByRole("link", { name: /whatsapp/i }));

    expect(spy).toHaveBeenCalledWith({ sourcePage: window.location.pathname, productName: "Sandalwood Agarbatti" });
  });

  it("fires click_call when the Call link is clicked", () => {
    const spy = vi.spyOn(analytics, "trackCallClick");
    render(<EnquiryActions {...full} />);

    fireEvent.click(screen.getByRole("link", { name: /call/i }));

    expect(spy).toHaveBeenCalledWith(window.location.pathname);
  });
});

describe("EnquiryActions — no contact info configured at all", () => {
  it("renders only the coming-soon message, no wa.me/mailto/tel link built from an empty value", () => {
    render(<EnquiryActions whatsappNumber="" email="" phone="" />);

    expect(screen.getByText(CONTACT_COMING_SOON)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("treats null/undefined the same as empty string for every field", () => {
    render(<EnquiryActions whatsappNumber={null} email={undefined} phone={null} />);

    expect(screen.getByText(CONTACT_COMING_SOON)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("EnquiryActions — fullWidthOnMobile (layout-only prop)", () => {
  it("keeps the same accessible names and hrefs as the default layout", () => {
    render(<EnquiryActions {...full} productName="Sandalwood Agarbatti" fullWidthOnMobile />);

    const whatsapp = screen.getByRole("link", { name: /whatsapp/i });
    expect(whatsapp).toHaveAttribute(
      "href",
      "https://wa.me/919999999999?text=Hi%2C%20I'm%20interested%20in%20%22Sandalwood%20Agarbatti%22.%20Could%20you%20share%20more%20details%3F"
    );
    expect(screen.getByRole("link", { name: /email/i }).getAttribute("href")).toContain(
      "mailto:shop@example.com"
    );
    expect(screen.getByRole("link", { name: /call/i })).toHaveAttribute("href", "tel:+919999999999");
  });

  it("applies the full-width mobile utility classes to each action", () => {
    render(<EnquiryActions {...full} fullWidthOnMobile />);
    for (const name of [/whatsapp/i, /email/i, /call/i]) {
      expect(screen.getByRole("link", { name })).toHaveClass("w-full");
    }
  });

  it("still renders the coming-soon note (no links) when no contact info is configured", () => {
    render(<EnquiryActions whatsappNumber="" email="" phone="" fullWidthOnMobile />);
    expect(screen.getByText(CONTACT_COMING_SOON)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
