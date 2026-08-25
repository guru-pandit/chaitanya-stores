// Thin wrapper around GTM's dataLayer — every push is SSR-safe (no-op when
// `window` doesn't exist yet) so these can be called from code that also
// runs during server rendering without needing a caller-side guard.
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

function pushToDataLayer(data: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(data);
}

export function gtmPageView(url: string) {
  pushToDataLayer({ event: "page_view", page_path: url });
}

export function gtmEvent(eventName: string, params: Record<string, unknown> = {}) {
  pushToDataLayer({ event: eventName, ...params });
}

// --- Catalog-specific event helpers -----------------------------------
// Thin, typed wrappers around gtmEvent so every call site sends the same
// param shape for a given event — see ANALYTICS_SETUP.md for the full event
// list and what each one means for the shop owner.

export function trackViewCategory(categoryName: string) {
  gtmEvent("view_category", { category_name: categoryName });
}

export function trackViewProduct(params: { itemName: string; itemCategory: string; itemId: string }) {
  gtmEvent("view_product", {
    item_name: params.itemName,
    item_category: params.itemCategory,
    item_id: params.itemId,
  });
}

export function trackSearch(searchTerm: string) {
  gtmEvent("search", { search_term: searchTerm });
}

// The two highest-priority conversion events — every WhatsApp/tel link in
// the codebase fires one of these on click (EnquiryActions, the contact
// page's own cards, and the footer/shop-location lists).
export function trackWhatsappClick(params: { sourcePage: string; productName?: string }) {
  gtmEvent("click_whatsapp", {
    source_page: params.sourcePage,
    product_name: params.productName ?? "general",
  });
}

export function trackCallClick(sourcePage: string) {
  gtmEvent("click_call", { source_page: sourcePage });
}

export function trackContactView(sourcePage: string) {
  gtmEvent("click_contact", { source_page: sourcePage });
}

export function trackFilterCategory(selected: string) {
  gtmEvent("filter_category", { selected });
}

export function trackImageView(params: { productName: string; imageIndex: number }) {
  gtmEvent("image_view", { product_name: params.productName, image_index: params.imageIndex });
}

export function trackScrollDepth(percent: 50 | 90) {
  gtmEvent(`scroll_${percent}`);
}
