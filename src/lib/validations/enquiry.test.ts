import { describe, it, expect } from "vitest";
import { updateEnquirySchema } from "./enquiry";

describe("updateEnquirySchema", () => {
  it("accepts a valid boolean isCompleted", () => {
    expect(updateEnquirySchema.safeParse({ isCompleted: true }).success).toBe(true);
    expect(updateEnquirySchema.safeParse({ isCompleted: false }).success).toBe(true);
  });

  it("rejects a non-boolean isCompleted", () => {
    expect(updateEnquirySchema.safeParse({ isCompleted: "yes" }).success).toBe(false);
  });

  it("rejects a missing isCompleted", () => {
    expect(updateEnquirySchema.safeParse({}).success).toBe(false);
  });
});
