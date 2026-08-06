import { z } from "zod";
import { uploadPathSchema, MAX_HERO_IMAGES } from "@/lib/validations/uploadPath";

export const siteSettingsSchema = z.object({
  heroImages: z
    .array(uploadPathSchema())
    .max(MAX_HERO_IMAGES, `At most ${MAX_HERO_IMAGES} hero images are allowed`),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
