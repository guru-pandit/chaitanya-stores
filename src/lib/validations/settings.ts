import { z } from "zod";

export const siteSettingsSchema = z.object({
  heroImages: z.array(z.string()),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
