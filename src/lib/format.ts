export function formatPrice(paise: number | null | undefined): string {
  if (paise == null) return "Contact for price";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function variantPriceRange(variants: { price: number }[]): { min: number; max: number } {
  const prices = variants.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function formatVariantPrice(variants: { price: number }[]): string {
  const { min, max } = variantPriceRange(variants);
  return min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`;
}

// `date` is typed as `Date` (the Prisma-generated shape) but at every call
// site it actually arrived through `apiFetch`'s `res.json()` — JSON has no
// Date type, so DateTime fields land as ISO strings at runtime despite the
// type. `new Date(...)` normalizes either shape before formatting; passing
// a bare string straight to `.toISOString()` would throw.
export function toDateInputValue(date: Date | string | null | undefined): string {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

export function parseImages(images: string): string[] {
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function buildSlug(category: string, brand: string, name: string): string {
  return [category, brand, name].map(slugify).filter(Boolean).join("-");
}

export function buildSkuPrefix(brand: string, category: string): string {
  const code = (input: string) =>
    input
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 3);
  return `${code(brand)}-${code(category)}`;
}
