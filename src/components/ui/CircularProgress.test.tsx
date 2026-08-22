import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CircularProgress } from "./CircularProgress";

describe("CircularProgress", () => {
  it("exposes the current value as an accessible progressbar", () => {
    render(<CircularProgress value={42} />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("shows the percentage label at the default size", () => {
    render(<CircularProgress value={57} />);

    expect(screen.getByText("57%")).toBeInTheDocument();
  });

  it("hides the percentage label below the legibility threshold", () => {
    render(<CircularProgress value={57} size={20} />);

    expect(screen.queryByText("57%")).not.toBeInTheDocument();
  });

  it("shows the percentage label right at the legibility threshold", () => {
    render(<CircularProgress value={57} size={24} />);

    expect(screen.getByText("57%")).toBeInTheDocument();
  });

  it("clamps a value above 100 down to 100", () => {
    render(<CircularProgress value={150} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("clamps a negative value up to 0", () => {
    render(<CircularProgress value={-20} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders at the requested pixel size", () => {
    render(<CircularProgress value={10} size={48} />);

    expect(screen.getByRole("progressbar")).toHaveStyle({ width: "48px", height: "48px" });
  });
});
