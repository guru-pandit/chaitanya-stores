import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { FooterShopContacts, type FooterShopContact } from "./FooterShopContacts";
import { CONTACT_COMING_SOON } from "@/lib/site-config";

const sangmeshwar: FooterShopContact = {
  id: "s1",
  name: "Chaitanya Stores — Sangmeshwar",
  address: "Main Road, Sangmeshwar, Ratnagiri 415611",
  phone: "+919876543210",
  email: "sangmeshwar@chaitanyastores.in",
  isPrimary: true,
};

const devrukh: FooterShopContact = {
  id: "s2",
  name: "Chaitanya Stores — Devrukh",
  address: "Market Yard, Devrukh, Ratnagiri 415804",
  phone: "+919812345678",
  email: "devrukh@chaitanyastores.in",
  isPrimary: false,
};

describe("FooterShopContacts", () => {
  it("renders name, phone and email for every shop, not just the primary one", () => {
    render(<FooterShopContacts shops={[sangmeshwar, devrukh]} />);

    for (const shop of [sangmeshwar, devrukh]) {
      expect(screen.getByText(shop.name)).toBeInTheDocument();
      expect(screen.getByText(shop.phone)).toBeInTheDocument();
      expect(screen.getByText(shop.email)).toBeInTheDocument();
      expect(screen.getByText(shop.address)).toBeInTheDocument();
    }
  });

  it("renders one list item per shop", () => {
    render(<FooterShopContacts shops={[sangmeshwar, devrukh]} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("makes each shop's phone a tel: link and email a mailto: link", () => {
    render(<FooterShopContacts shops={[sangmeshwar, devrukh]} />);

    expect(screen.getByText(devrukh.phone).closest("a")).toHaveAttribute(
      "href",
      `tel:${devrukh.phone}`
    );
    expect(screen.getByText(devrukh.email).closest("a")).toHaveAttribute(
      "href",
      `mailto:${devrukh.email}`
    );
  });

  it("marks the primary shop — and only the primary shop — with a Main badge", () => {
    render(<FooterShopContacts shops={[sangmeshwar, devrukh]} />);

    const badges = screen.getAllByText("Main");
    expect(badges).toHaveLength(1);
    expect(screen.getByText(sangmeshwar.name).closest("li")).toContainElement(badges[0]);
  });

  it("omits the Main badge when there is only one shop to distinguish", () => {
    render(<FooterShopContacts shops={[sangmeshwar]} />);

    expect(screen.queryByText("Main")).not.toBeInTheDocument();
  });

  it("skips a blank field rather than rendering an empty tel:/mailto: link", () => {
    render(<FooterShopContacts shops={[{ ...devrukh, phone: "", email: "" }]} />);

    const item = screen.getByRole("listitem");
    expect(within(item).queryByRole("link")).not.toBeInTheDocument();
    expect(within(item).getByText(devrukh.address)).toBeInTheDocument();
  });

  it("falls back to the coming-soon message for a shop with no contact details at all", () => {
    render(
      <FooterShopContacts shops={[{ ...devrukh, address: "", phone: "", email: "" }]} />
    );

    expect(screen.getByText(CONTACT_COMING_SOON)).toBeInTheDocument();
  });

  it("does not show the coming-soon message when at least one detail exists", () => {
    render(<FooterShopContacts shops={[{ ...devrukh, address: "", email: "" }]} />);

    expect(screen.queryByText(CONTACT_COMING_SOON)).not.toBeInTheDocument();
    expect(screen.getByText(devrukh.phone)).toBeInTheDocument();
  });
});
