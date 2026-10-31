import { z } from "zod";

export const shopLocationSchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  address: z.string().min(1, "Address is required").max(500),
  phone: z.string().min(1, "Phone is required").max(30),
  whatsappNumber: z
    .string()
    .min(1, "WhatsApp number is required")
    .regex(
      /^\d{11,15}$/,
      "Use digits only with the country code, e.g. 919876543210 (no +, spaces or dashes)"
    ),
  email: z.string().min(1, "Email is required").email("Enter a valid email").max(150),
  mapLink: z.string().trim().url("Enter a valid URL").max(500).optional().or(z.literal("")),
  isPrimary: z.boolean(),
});

export type ShopLocationInput = z.infer<typeof shopLocationSchema>;
