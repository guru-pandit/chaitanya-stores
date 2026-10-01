import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as analytics from "@/lib/analytics";
import { TrackedLink } from "./TrackedLink";

afterEach(() => vi.restoreAllMocks());

describe("TrackedLink", () => {
  it("fires click_whatsapp with source page and product name", () => {
    const spy = vi.spyOn(analytics, "trackWhatsappClick");
    render(<TrackedLink track="whatsapp" productName="Dhoop" href="#">wa</TrackedLink>);
    fireEvent.click(screen.getByRole("link"));
    expect(spy).toHaveBeenCalledWith({ sourcePage: window.location.pathname, productName: "Dhoop" });
  });

  it("fires click_call with the source page", () => {
    const spy = vi.spyOn(analytics, "trackCallClick");
    render(<TrackedLink track="call" href="#">call</TrackedLink>);
    fireEvent.click(screen.getByRole("link"));
    expect(spy).toHaveBeenCalledWith(window.location.pathname);
  });

  it("fires nothing when no track type is given", () => {
    const wa = vi.spyOn(analytics, "trackWhatsappClick");
    const call = vi.spyOn(analytics, "trackCallClick");
    render(<TrackedLink href="#">mail</TrackedLink>);
    fireEvent.click(screen.getByRole("link"));
    expect(wa).not.toHaveBeenCalled();
    expect(call).not.toHaveBeenCalled();
  });
});
