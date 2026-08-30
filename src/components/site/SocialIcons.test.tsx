import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { WhatsAppIcon, InstagramIcon, FacebookIcon } from "./SocialIcons";

describe("WhatsAppIcon", () => {
  it("renders an svg element", () => {
    const { container } = render(<WhatsAppIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("is decorative: aria-hidden so screen readers skip it (labels live on the parent link)", () => {
    const { container } = render(<WhatsAppIcon />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("defaults to a 20px box and honours an explicit size", () => {
    const { container: def } = render(<WhatsAppIcon />);
    expect(def.querySelector("svg")).toHaveAttribute("width", "20");
    expect(def.querySelector("svg")).toHaveAttribute("height", "20");

    const { container: sized } = render(<WhatsAppIcon size={18} />);
    expect(sized.querySelector("svg")).toHaveAttribute("width", "18");
    expect(sized.querySelector("svg")).toHaveAttribute("height", "18");
  });

  it("forwards className for colour control", () => {
    const { container } = render(<WhatsAppIcon className="text-cream" />);
    expect(container.querySelector("svg")).toHaveClass("text-cream");
  });

  it("fills with currentColor (single-colour brand mark)", () => {
    const { container } = render(<WhatsAppIcon />);
    expect(container.querySelector("svg")).toHaveAttribute("fill", "currentColor");
  });
});

describe("SocialIcons — Instagram / Facebook remain aria-hidden decorative marks", () => {
  it("InstagramIcon is aria-hidden", () => {
    const { container } = render(<InstagramIcon />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("FacebookIcon is aria-hidden", () => {
    const { container } = render(<FacebookIcon />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
