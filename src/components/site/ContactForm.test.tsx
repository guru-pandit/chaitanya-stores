import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContactForm } from "./ContactForm";
import { CONTACT_COMING_SOON } from "@/lib/site-config";

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Asha" } });
  fireEvent.change(screen.getByLabelText(/phone or email/i), {
    target: { value: "asha@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/message/i), {
    target: { value: "Do you have sandalwood dhoop?" },
  });
  fireEvent.click(screen.getByRole("button", { name: /send message/i }));
}

describe("ContactForm — honeypot field", () => {
  it("renders the honeypot input hidden from sighted/assistive users and out of the tab order", () => {
    render(<ContactForm whatsappNumber="919999999999" />);

    const honeypot = screen.getByLabelText("Leave this field blank", {
      selector: "input",
    }) as HTMLInputElement;
    expect(honeypot).toHaveAttribute("tabIndex", "-1");
    expect(honeypot).toHaveAttribute("autoComplete", "off");
    expect(honeypot).toHaveAttribute("data-lpignore", "true");
    expect(honeypot).toHaveAttribute("data-1p-ignore", "");
    expect(honeypot.closest("div")).toHaveAttribute("aria-hidden", "true");
    expect(honeypot.closest("div")).toHaveClass("sr-only");
    // Never pre-filled — a real visitor's browser autofill/password manager
    // seeing an empty, hidden "Company" field is exactly the trap.
    expect(honeypot.value).toBe("");
  });

  it("submits the honeypot's current value (empty for a real visitor) as part of the payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ContactForm whatsappNumber="919999999999" />);
    fillAndSubmit();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.hp_ref).toBe("");

    vi.unstubAllGlobals();
  });
});

describe("ContactForm — post-submit thank-you panel", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "1" }) })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a persistent thank-you panel (not a transient toast) with a WhatsApp fallback link when a number is available", async () => {
    render(<ContactForm whatsappNumber="919999999999" />);
    fillAndSubmit();

    await waitFor(() =>
      expect(screen.getByText(/we'll get back to you soon/i)).toBeInTheDocument()
    );
    // The form itself should be gone, replaced by the panel.
    expect(screen.queryByRole("button", { name: /send message/i })).not.toBeInTheDocument();

    const whatsappLink = screen.getByRole("link", { name: /message us on whatsapp/i });
    expect(whatsappLink).toHaveAttribute("href", expect.stringContaining("https://wa.me/919999999999"));
  });

  it("shows the coming-soon fallback text instead of a WhatsApp link when no whatsappNumber is available", async () => {
    render(<ContactForm whatsappNumber="" />);
    fillAndSubmit();

    await waitFor(() =>
      expect(screen.getByText(/we'll get back to you soon/i)).toBeInTheDocument()
    );
    expect(screen.queryByRole("link", { name: /whatsapp/i })).not.toBeInTheDocument();
    expect(screen.getByText(CONTACT_COMING_SOON)).toBeInTheDocument();
  });

  it("shows the coming-soon fallback when whatsappNumber prop is omitted entirely", async () => {
    render(<ContactForm />);
    fillAndSubmit();

    await waitFor(() =>
      expect(screen.getByText(/we'll get back to you soon/i)).toBeInTheDocument()
    );
    expect(screen.getByText(CONTACT_COMING_SOON)).toBeInTheDocument();
  });
});

describe("ContactForm — submission error", () => {
  it("keeps the form visible (no thank-you panel) and surfaces an error when the API call fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Too many requests" }),
      })
    );

    render(<ContactForm whatsappNumber="919999999999" />);
    fillAndSubmit();

    await waitFor(() => expect(screen.getByText("Too many requests")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
    expect(screen.queryByText(/we'll get back to you soon/i)).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
