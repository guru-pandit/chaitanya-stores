import { z } from "zod";

export const shopLocationSchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  address: z.string().min(1, "Address is required").max(500),
  phone: z.string().min(1, "Phone is required").max(30),
  whatsappNumber: z.string().min(1, "WhatsApp number is required").max(30),
  email: z.string().min(1, "Email is required").email("Enter a valid email").max(150),
  mapLink: z.string().trim().url("Enter a valid URL").max(500).optional().or(z.literal("")),
  isPrimary: z.boolean(),
});

export type ShopLocationInput = z.infer<typeof shopLocationSchema>;
