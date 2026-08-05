import { z } from "zod";

export const updateEnquirySchema = z.object({
  isCompleted: z.boolean(),
});

export type UpdateEnquiryInput = z.infer<typeof updateEnquirySchema>;
