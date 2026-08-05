import { z } from "zod";

export const contactSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1, "Name is required").max(150),
  contactMethod: z.string().min(1, "Please share a phone number or email"),
  message: z.string().min(1, "Message is required").max(2000),
});

export type ContactInput = z.infer<typeof contactSchema>;
