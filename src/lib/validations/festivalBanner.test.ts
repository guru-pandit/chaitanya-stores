import { describe, it, expect } from "vitest";
import { festivalBannerSchema, toFestivalBannerData } from "./festivalBanner";

const valid = {
  label: "Diwali 2026",
  mediaType: "IMAGE" as const,
  mediaPath: "/uploads/diwali.jpg",
  isActive: false,
  startDate: "",
  endDate: "",
};

describe("festivalBannerSchema", () => {
  it("accepts a fully valid image banner with no dates", () => {
    expect(festivalBannerSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a valid video banner", () => {
    const result = festivalBannerSchema.safeParse({
      ...valid,
      mediaType: "VIDEO",
      mediaPath: "/uploads/offer.mp4",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid start/end dates", () => {
    const result = festivalBannerSchema.safeParse({
      ...valid,
      startDate: "2026-10-20",
      endDate: "2026-11-05",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty label", () => {
    expect(festivalBannerSchema.safeParse({ ...valid, label: "" }).success).toBe(false);
  });

  it("rejects an empty mediaPath", () => {
    expect(festivalBannerSchema.safeParse({ ...valid, mediaPath: "" }).success).toBe(false);
  });

  it("rejects an invalid mediaType", () => {
    const result = festivalBannerSchema.safeParse({ ...valid, mediaType: "AUDIO" });
    expect(result.success).toBe(false);
  });

  it("requires isActive to be a boolean", () => {
    const result = festivalBannerSchema.safeParse({ ...valid, isActive: "yes" });
    expect(result.success).toBe(false);
  });
});

describe("toFestivalBannerData", () => {
  it("converts empty date strings to null", () => {
    const data = toFestivalBannerData(valid);
    expect(data.startDate).toBeNull();
    expect(data.endDate).toBeNull();
  });

  it("anchors start/end dates to the business's timezone (start-of-day / end-of-day IST), not UTC midnight", () => {
    const data = toFestivalBannerData({ ...valid, startDate: "2026-10-20", endDate: "2026-11-05" });
    expect(data.startDate).toEqual(new Date("2026-10-20T00:00:00.000+05:30"));
    expect(data.endDate).toEqual(new Date("2026-11-05T23:59:59.999+05:30"));
  });

  it("keeps the end-of-day banner visible through the whole IST calendar day", () => {
    // A bare `new Date("2026-11-05")` (UTC midnight) is 5:30am IST — well
    // before end of day. The anchored value must be after that bare parse.
    const data = toFestivalBannerData({ ...valid, endDate: "2026-11-05" });
    expect(data.endDate!.getTime()).toBeGreaterThan(new Date("2026-11-05").getTime());
  });

  it("passes through the other fields unchanged", () => {
    const data = toFestivalBannerData(valid);
    expect(data.label).toBe(valid.label);
    expect(data.mediaType).toBe(valid.mediaType);
    expect(data.mediaPath).toBe(valid.mediaPath);
    expect(data.isActive).toBe(valid.isActive);
  });
});
