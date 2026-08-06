import { z } from "zod";

export const contactSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1, "Name is required").max(150),
  contactMethod: z
    .string()
    .min(1, "Please share a phone number or email")
    .max(500, "Contact method is too long — please keep it under 500 characters"),
  message: z.string().min(1, "Message is required").max(2000),
});

export type ContactInput = z.infer<typeof contactSchema>;
