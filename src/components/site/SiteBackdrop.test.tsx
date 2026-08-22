import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SiteBackdrop } from "./SiteBackdrop";

function renderBackdrop() {
  const { container } = render(<SiteBackdrop />);
  return container.firstElementChild as HTMLElement;
}

describe("SiteBackdrop", () => {
  it("is fixed and behind the content, so the page scrolls over a still motif", () => {
    const root = renderBackdrop();

    expect(root).toHaveClass("fixed");
    expect(root).toHaveClass("inset-0");
    expect(root).toHaveClass("-z-10");
  });

  it("never intercepts clicks meant for the content above it", () => {
    expect(renderBackdrop()).toHaveClass("pointer-events-none");
  });

  it("is hidden from assistive technology — it carries no information", () => {
    const root = renderBackdrop();

    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root.querySelectorAll("svg[aria-hidden='true']").length).toBeGreaterThan(0);
  });

  it("paints an opaque base so it never shows through to the raw canvas", () => {
    expect(renderBackdrop()).toHaveClass("bg-cream");
  });

  it("clips its bleeding decorations instead of widening the page", () => {
    // The mandalas are positioned off-viewport on purpose; without this the
    // page would scroll sideways on mobile.
    expect(renderBackdrop()).toHaveClass("overflow-hidden");
  });

  it("keeps every decorative layer faint enough to sit under body text", () => {
    const root = renderBackdrop();

    const lattice = root.querySelector("rect[fill='url(#backdrop-lattice)']");
    expect(Number(lattice?.getAttribute("opacity"))).toBeLessThanOrEqual(0.08);
  });

  it("renders the repeating lattice via a single reusable pattern definition", () => {
    const root = renderBackdrop();

    expect(root.querySelector("pattern#backdrop-lattice")).toBeInTheDocument();
  });

  it("renders both mandalas", () => {
    const root = renderBackdrop();

    // Two mandalas + one lattice svg.
    expect(root.querySelectorAll("svg")).toHaveLength(3);
  });

  it("ships no images or network-dependent assets", () => {
    const root = renderBackdrop();

    expect(root.querySelectorAll("img")).toHaveLength(0);
    expect(root.innerHTML).not.toContain("url(http");
  });
});
