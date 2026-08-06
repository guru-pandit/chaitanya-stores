import { z } from "zod";
import { BUSINESS_UTC_OFFSET } from "@/lib/site-config";
import { uploadPathSchema } from "@/lib/validations/uploadPath";

export const festivalBannerMediaTypeSchema = z.enum(["IMAGE", "VIDEO"]);

export const festivalBannerSchema = z.object({
  label: z.string().min(1, "Label is required").max(150),
  mediaType: festivalBannerMediaTypeSchema,
  mediaPath: uploadPathSchema("Image or video is required"),
  isActive: z.boolean(),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
});

export type FestivalBannerInput = z.infer<typeof festivalBannerSchema>;

// Shared by the create and update API routes — the form/API boundary works
// in "YYYY-MM-DD" strings (or "" for unset) since that's what
// `<input type="date">` produces, but Prisma's DateTime columns need real
// `Date` objects or `null`.
export function toFestivalBannerData(input: FestivalBannerInput) {
  const { startDate, endDate, ...rest } = input;
  return {
    ...rest,
    // Anchored to the business's own timezone (start/end of that calendar
    // day in India), not UTC midnight — a bare `new Date("YYYY-MM-DD")`
    // parses as UTC midnight, which is 5:30am IST and cuts the banner off
    // hours early on its end date for any timezone at or ahead of UTC.
    startDate: startDate ? new Date(`${startDate}T00:00:00.000${BUSINESS_UTC_OFFSET}`) : null,
    endDate: endDate ? new Date(`${endDate}T23:59:59.999${BUSINESS_UTC_OFFSET}`) : null,
  };
}
