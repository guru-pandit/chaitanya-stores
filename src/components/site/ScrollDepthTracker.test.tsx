import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { ScrollDepthTracker } from "./ScrollDepthTracker";
import * as analytics from "@/lib/analytics";

let mockPathname = "/catalog";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

function setScrollGeometry({ scrollHeight, innerHeight, scrollY }: { scrollHeight: number; innerHeight: number; scrollY: number }) {
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: scrollHeight });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: innerHeight });
  Object.defineProperty(window, "scrollY", { configurable: true, value: scrollY });
}

beforeEach(() => {
  mockPathname = "/catalog";
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ScrollDepthTracker", () => {
  it("fires scroll_50 once past the 50% mark", () => {
    const spy = vi.spyOn(analytics, "trackScrollDepth");
    render(<ScrollDepthTracker />);

    // 2000px scrollable range (3000 - 1000); 50% = scrollY 1000.
    setScrollGeometry({ scrollHeight: 3000, innerHeight: 1000, scrollY: 1000 });
    window.dispatchEvent(new Event("scroll"));
    setScrollGeometry({ scrollHeight: 3000, innerHeight: 1000, scrollY: 1100 });
    window.dispatchEvent(new Event("scroll"));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(50);
  });

  it("fires scroll_90 (and not a second scroll_50) once past the 90% mark", () => {
    const spy = vi.spyOn(analytics, "trackScrollDepth");
    render(<ScrollDepthTracker />);

    setScrollGeometry({ scrollHeight: 3000, innerHeight: 1000, scrollY: 1900 });
    window.dispatchEvent(new Event("scroll"));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(90);
  });

  it("does nothing when the page isn't scrollable", () => {
    const spy = vi.spyOn(analytics, "trackScrollDepth");
    render(<ScrollDepthTracker />);

    setScrollGeometry({ scrollHeight: 800, innerHeight: 1000, scrollY: 0 });
    window.dispatchEvent(new Event("scroll"));

    expect(spy).not.toHaveBeenCalled();
  });
});
