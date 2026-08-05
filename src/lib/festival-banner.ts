import { prisma } from "@/lib/prisma";
import type { FestivalBanner } from "@/generated/prisma/client";

// The one banner (if any) currently eligible to show to visitors — active,
// and within its optional date window. `null` (no active banner) is a
// normal, expected steady state between festivals, not a fallback case.
export async function getActiveFestivalBanner(): Promise<FestivalBanner | null> {
  const now = new Date();
  return prisma.festivalBanner.findFirst({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    },
  });
}
