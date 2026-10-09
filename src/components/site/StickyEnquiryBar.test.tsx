import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as analytics from "@/lib/analytics";
import { StickyEnquiryBar } from "./StickyEnquiryBar";
import { buildWhatsappLink, buildMailtoLink, buildTelLink } from "@/lib/site-config";

const productName = 'Sandalwood "Premium" Agarbatti';
const contacts = {
  whatsappNumber: "919999999999",
  phone: "+919888888888",
  email: "shop@example.com",
};

describe("StickyEnquiryBar — primary action selection (WhatsApp → Phone → Email)", () => {
  it("uses WhatsApp as the primary action when a WhatsApp number is present", () => {
    render(<StickyEnquiryBar productName={productName} {...contacts} />);
    const primary = screen.getByRole("link", { name: "Enquire on WhatsApp" });
    expect(primary).toHaveAttribute("href", buildWhatsappLink(contacts.whatsappNumber, productName));
    expect(primary).toHaveAttribute("target", "_blank");
    expect(primary).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("falls back to Call when WhatsApp is absent", () => {
    render(
      <StickyEnquiryBar
        productName={productName}
        whatsappNumber=""
        phone={contacts.phone}
        email={contacts.email}
      />
    );
    const primary = screen.getByRole("link", { name: "Call the shop" });
    expect(primary).toHaveAttribute("href", buildTelLink(contacts.phone));
    expect(primary).not.toHaveAttribute("target");
  });

  it("falls back to Email when WhatsApp and phone are both absent", () => {
    render(
      <StickyEnquiryBar
        productName={productName}
        whatsappNumber={null}
        phone={null}
        email={contacts.email}
      />
    );
    const primary = screen.getByRole("link", { name: "Email the shop" });
    expect(primary).toHaveAttribute("href", buildMailtoLink(contacts.email, productName));
  });

  it("renders nothing when no contact info is configured", () => {
    const { container } = render(
      <StickyEnquiryBar productName={productName} whatsappNumber="" phone="" email="" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when every contact field is null/undefined", () => {
    const { container } = render(
      <StickyEnquiryBar productName={productName} whatsappNumber={null} phone={undefined} email={null} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("StickyEnquiryBar — secondary icon actions", () => {
  it("shows Call and Email as secondary buttons alongside the WhatsApp primary", () => {
    render(<StickyEnquiryBar productName={productName} {...contacts} />);
    expect(screen.getByRole("link", { name: "Call the shop" })).toHaveAttribute(
      "href",
      buildTelLink(contacts.phone)
    );
    expect(screen.getByRole("link", { name: "Email the shop" })).toHaveAttribute(
      "href",
      buildMailtoLink(contacts.email, productName)
    );
  });

  it("does not duplicate the primary channel as a secondary button (phone primary → no second Call link)", () => {
    render(
      <StickyEnquiryBar
        productName={productName}
        whatsappNumber=""
        phone={contacts.phone}
        email={contacts.email}
      />
    );
    expect(screen.getAllByRole("link", { name: "Call the shop" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Email the shop" })).toBeInTheDocument();
  });
});

describe("StickyEnquiryBar — product name encoding", () => {
  it("URL-encodes the product name (quotes, spaces) in the WhatsApp link", () => {
    render(<StickyEnquiryBar productName={productName} whatsappNumber={contacts.whatsappNumber} />);
    const href = screen.getByRole("link", { name: "Enquire on WhatsApp" }).getAttribute("href")!;
    expect(href).toContain("wa.me/919999999999");
    expect(href).toContain(encodeURIComponent(productName));
    expect(href).not.toContain('"Premium"');
  });

  it("URL-encodes the product name in the mailto subject and body", () => {
    render(
      <StickyEnquiryBar productName={productName} whatsappNumber={null} phone={null} email={contacts.email} />
    );
    const href = screen.getByRole("link", { name: "Email the shop" }).getAttribute("href")!;
    expect(href).toContain(`subject=${encodeURIComponent(`Enquiry: ${productName}`)}`);
    expect(href).toContain(encodeURIComponent(productName));
  });
});

describe("StickyEnquiryBar — analytics", () => {
  afterEach(() => vi.restoreAllMocks());

  it("fires click_whatsapp with the product name from the primary button", () => {
    const spy = vi.spyOn(analytics, "trackWhatsappClick");
    render(<StickyEnquiryBar productName={productName} {...contacts} />);
    fireEvent.click(screen.getByRole("link", { name: "Enquire on WhatsApp" }));
    expect(spy).toHaveBeenCalledWith({ sourcePage: window.location.pathname, productName });
  });

  it("fires click_call from the secondary Call icon", () => {
    const spy = vi.spyOn(analytics, "trackCallClick");
    render(<StickyEnquiryBar productName={productName} {...contacts} />);
    fireEvent.click(screen.getByRole("link", { name: "Call the shop" }));
    expect(spy).toHaveBeenCalledWith(window.location.pathname);
  });

  it("fires no conversion event when Email is the primary action", () => {
    const wa = vi.spyOn(analytics, "trackWhatsappClick");
    const call = vi.spyOn(analytics, "trackCallClick");
    render(<StickyEnquiryBar productName={productName} email={contacts.email} />);
    fireEvent.click(screen.getByRole("link", { name: "Email the shop" }));
    expect(wa).not.toHaveBeenCalled();
    expect(call).not.toHaveBeenCalled();
  });
});
