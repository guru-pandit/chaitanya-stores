import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, hyphen-separated"),
  description: z.string().max(1000).optional().or(z.literal("")),
  image: z.string().optional().or(z.literal("")),
});

export type CategoryInput = z.infer<typeof categorySchema>;
