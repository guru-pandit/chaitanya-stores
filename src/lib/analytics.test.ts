import { describe, it, expect, beforeEach } from "vitest";
import {
  gtmPageView,
  gtmEvent,
  trackViewCategory,
  trackViewProduct,
  trackSearch,
  trackWhatsappClick,
  trackCallClick,
  trackContactView,
  trackFilterCategory,
  trackImageView,
  trackScrollDepth,
} from "./analytics";

beforeEach(() => {
  window.dataLayer = [];
});

describe("gtmPageView", () => {
  it("pushes a page_view event with the given path", () => {
    gtmPageView("/catalog/sandalwood-agarbatti");

    expect(window.dataLayer).toEqual([
      { event: "page_view", page_path: "/catalog/sandalwood-agarbatti" },
    ]);
  });
});

describe("gtmEvent", () => {
  it("pushes the event name merged with the given params", () => {
    gtmEvent("custom_event", { foo: "bar" });

    expect(window.dataLayer).toEqual([{ event: "custom_event", foo: "bar" }]);
  });

  it("pushes just the event name when no params are given", () => {
    gtmEvent("custom_event");

    expect(window.dataLayer).toEqual([{ event: "custom_event" }]);
  });

  it("does not throw when window.dataLayer does not exist yet", () => {
    delete window.dataLayer;

    expect(() => gtmEvent("custom_event")).not.toThrow();
    expect(window.dataLayer).toEqual([{ event: "custom_event" }]);
  });
});

describe("catalog event helpers", () => {
  it("trackViewCategory sends the category name", () => {
    trackViewCategory("Agarbatti");
    expect(window.dataLayer).toEqual([{ event: "view_category", category_name: "Agarbatti" }]);
  });

  it("trackViewProduct sends item name/category/id", () => {
    trackViewProduct({ itemName: "Sandalwood Agarbatti", itemCategory: "Agarbatti", itemId: "sandalwood-agarbatti" });
    expect(window.dataLayer).toEqual([
      {
        event: "view_product",
        item_name: "Sandalwood Agarbatti",
        item_category: "Agarbatti",
        item_id: "sandalwood-agarbatti",
      },
    ]);
  });

  it("trackSearch sends the search term", () => {
    trackSearch("chandan");
    expect(window.dataLayer).toEqual([{ event: "search", search_term: "chandan" }]);
  });

  it("trackWhatsappClick defaults product_name to 'general' when omitted", () => {
    trackWhatsappClick({ sourcePage: "/contact" });
    expect(window.dataLayer).toEqual([
      { event: "click_whatsapp", source_page: "/contact", product_name: "general" },
    ]);
  });

  it("trackWhatsappClick sends the given product name", () => {
    trackWhatsappClick({ sourcePage: "/catalog/sandalwood-agarbatti", productName: "Sandalwood Agarbatti" });
    expect(window.dataLayer).toEqual([
      {
        event: "click_whatsapp",
        source_page: "/catalog/sandalwood-agarbatti",
        product_name: "Sandalwood Agarbatti",
      },
    ]);
  });

  it("trackCallClick sends the source page", () => {
    trackCallClick("/contact");
    expect(window.dataLayer).toEqual([{ event: "click_call", source_page: "/contact" }]);
  });

  it("trackContactView sends the source page", () => {
    trackContactView("/contact");
    expect(window.dataLayer).toEqual([{ event: "click_contact", source_page: "/contact" }]);
  });

  it("trackFilterCategory sends the selected value", () => {
    trackFilterCategory("Dhoop");
    expect(window.dataLayer).toEqual([{ event: "filter_category", selected: "Dhoop" }]);
  });

  it("trackImageView sends product name and image index", () => {
    trackImageView({ productName: "Sandalwood Agarbatti", imageIndex: 2 });
    expect(window.dataLayer).toEqual([
      { event: "image_view", product_name: "Sandalwood Agarbatti", image_index: 2 },
    ]);
  });

  it("trackScrollDepth sends scroll_50/scroll_90 as distinct event names", () => {
    trackScrollDepth(50);
    trackScrollDepth(90);
    expect(window.dataLayer).toEqual([{ event: "scroll_50" }, { event: "scroll_90" }]);
  });
});
