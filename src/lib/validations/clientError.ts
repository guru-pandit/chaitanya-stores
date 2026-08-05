import { z } from "zod";

export const clientErrorSchema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(4000).optional(),
  digest: z.string().max(200).optional(),
  url: z.string().max(500),
});

export type ClientErrorInput = z.infer<typeof clientErrorSchema>;
