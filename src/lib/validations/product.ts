import { z } from "zod";
import { uploadPathSchema, MAX_PRODUCT_IMAGES } from "@/lib/validations/uploadPath";

export const productVariantSchema = z.object({
  label: z.string().min(1, "Label is required").max(50),
  price: z.number().int().positive("Price must be greater than 0"),
  inStock: z.boolean(),
});

export type ProductVariantInput = z.infer<typeof productVariantSchema>;

export const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, hyphen-separated"),
  description: z.string().max(2000).optional().or(z.literal("")),
  brand: z.string().min(1, "Brand is required").max(100),
  weight: z.string().max(50).optional().or(z.literal("")),
  productType: z.string().max(50).optional().or(z.literal("")),
  sku: z.string().min(1, "SKU is required").max(50),
  price: z.number().int().positive().optional().nullable(),
  images: z
    .array(uploadPathSchema())
    .max(MAX_PRODUCT_IMAGES, `A product can have at most ${MAX_PRODUCT_IMAGES} images`),
  inStock: z.boolean(),
  featured: z.boolean(),
  categoryId: z.string().min(1, "Category is required"),
  variants: z.array(productVariantSchema),
});

export type ProductInput = z.infer<typeof productSchema>;

// Shared by the create and update API routes — Prisma stores `images` as a JSON
// string and empty optional `weight` and `productType` as `null`.
// `variants` is excluded here since it's a relation, written separately by the
// API routes rather than as a scalar column on Product.
export function toProductData(input: ProductInput) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude the relation field from the scalar update payload
  const { images, weight, productType, variants: _variants, ...rest } = input;
  return {
    ...rest,
    weight: weight ? weight : null,
    productType: productType ? productType : null,
    images: JSON.stringify(images),
  };
}
