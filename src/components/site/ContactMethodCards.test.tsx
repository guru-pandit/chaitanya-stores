import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContactMethodCards } from "./ContactMethodCards";
import { CONTACT_COMING_SOON } from "@/lib/site-config";
import * as analytics from "@/lib/analytics";

const full = { whatsappNumber: "919999999999", email: "shop@example.com", phone: "+919999999999" };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ContactMethodCards", () => {
  it("renders WhatsApp, Email, and Call links when all contact details are present", () => {
    render(<ContactMethodCards {...full} />);

    expect(screen.getByRole("link", { name: /whatsapp/i })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/919999999999")
    );
    expect(screen.getByRole("link", { name: /email/i })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:shop@example.com")
    );
    expect(screen.getByRole("link", { name: /call/i })).toHaveAttribute("href", "tel:+919999999999");
  });

  it("shows the coming-soon fallback in place of a missing WhatsApp/Email/Call value", () => {
    render(<ContactMethodCards whatsappNumber="" email="" phone="" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getAllByText(CONTACT_COMING_SOON).length).toBe(3);
  });

  it("fires click_whatsapp when the WhatsApp card is clicked", () => {
    const spy = vi.spyOn(analytics, "trackWhatsappClick");
    render(<ContactMethodCards {...full} />);

    fireEvent.click(screen.getByRole("link", { name: /whatsapp/i }));

    expect(spy).toHaveBeenCalledWith({ sourcePage: window.location.pathname });
  });

  it("fires click_call when the Call card is clicked", () => {
    const spy = vi.spyOn(analytics, "trackCallClick");
    render(<ContactMethodCards {...full} />);

    fireEvent.click(screen.getByRole("link", { name: /call/i }));

    expect(spy).toHaveBeenCalledWith(window.location.pathname);
  });
});
