import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShopLocationsList } from "./ShopLocationsList";
import * as analytics from "@/lib/analytics";
import type { ShopLocation } from "@/generated/prisma/client";

const location = {
  id: "loc-1",
  name: "Chaitanya Stores",
  address: "Main Road, Sangmeshwar",
  phone: "+919876543210",
  email: "shop@example.com",
  mapLink: null,
  isPrimary: true,
} as ShopLocation;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ShopLocationsList", () => {
  it("renders nothing when there are no locations", () => {
    const { container } = render(<ShopLocationsList locations={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders name, address, phone, and email for each location", () => {
    render(<ShopLocationsList locations={[location]} />);

    expect(screen.getByText(location.name)).toBeInTheDocument();
    expect(screen.getByText(location.address)).toBeInTheDocument();
    expect(screen.getByText(location.phone)).toBeInTheDocument();
    expect(screen.getByText(location.email)).toBeInTheDocument();
  });

  it("fires click_call when the phone link is clicked", () => {
    const spy = vi.spyOn(analytics, "trackCallClick");
    render(<ShopLocationsList locations={[location]} />);

    fireEvent.click(screen.getByText(location.phone).closest("a")!);

    expect(spy).toHaveBeenCalledWith(window.location.pathname);
  });
});
