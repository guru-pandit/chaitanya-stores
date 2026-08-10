import { z } from "zod";

export const contactSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1, "Name is required").max(150),
  contactMethod: z
    .string()
    .min(1, "Please share a phone number or email")
    .max(500, "Contact method is too long — please keep it under 500 characters"),
  message: z.string().min(1, "Message is required").max(2000),
  // Honeypot: a field a real visitor never sees or fills in (hidden
  // off-screen in ContactForm), but a naive bot autofill script is likely
  // to target given the innocuous name. No length cap and no way for this
  // field to produce its own field-level validation error — a `400` keyed
  // `website` would be the one response path that names the trap to a
  // probing client. A non-empty value isn't rejected here at all; it's
  // handled in the route (POST /api/contact) by faking a normal success
  // response so a bot doesn't learn the check exists, while silently
  // dropping the submit. Request body size is already bounded upstream, so
  // an unbounded string here isn't a payload-size concern.
  website: z.string().optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
