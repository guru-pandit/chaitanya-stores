// Shared route predicates so pieces that must agree about a route don't each
// re-encode the path shape. `isProductDetailPath` in particular is the single
// definition of "this is a product detail page": the page itself renders
// <StickyEnquiryBar> there, and <BottomNav> hides its Enquire tab there so
// the two enquiry surfaces never stack.
export function isProductDetailPath(pathname: string): boolean {
  return pathname.startsWith("/catalog/") && pathname !== "/catalog";
}
