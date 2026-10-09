import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { TrackOnMount } from "./TrackOnMount";
import * as analytics from "@/lib/analytics";

describe("TrackOnMount", () => {
  it("fires the given event with params exactly once on mount", () => {
    const spy = vi.spyOn(analytics, "gtmEvent");

    const { rerender } = render(<TrackOnMount event="view_category" params={{ category_name: "Agarbatti" }} />);
    rerender(<TrackOnMount event="view_category" params={{ category_name: "Agarbatti" }} />);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("view_category", { category_name: "Agarbatti" });
  });

  it("renders nothing", () => {
    const { container } = render(<TrackOnMount event="click_contact" />);
    expect(container).toBeEmptyDOMElement();
  });
});
