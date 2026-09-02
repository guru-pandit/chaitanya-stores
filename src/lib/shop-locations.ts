import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site-config";
import type { ShopLocation } from "@/generated/prisma/client";

export type PrimaryShopLocation = ShopLocation | (Omit<ShopLocation, "id" | "createdAt" | "updatedAt"> & {
  id: null;
});

// Wrapped in React's `cache()` so the several Server Components that each
// need the shop contact details on one render — the (site) layout for
// <BottomNav>, the Footer, JSON-LD, and individual pages — share a single
// query pass per request instead of re-hitting the DB for the same rows.
//
// Falls back to the env-var contact details (src/lib/site-config.ts) until
// the admin has added at least one ShopLocation row, so the site never
// breaks between this shipping and that first admin action.
export const getPrimaryShopLocation = cache(
  async (): Promise<PrimaryShopLocation> => {
    const primary = await prisma.shopLocation.findFirst({ where: { isPrimary: true } });
    if (primary) return primary;

    const any = await prisma.shopLocation.findFirst();
    if (any) return any;

    return {
      id: null,
      name: siteConfig.name,
      address: siteConfig.address,
      phone: siteConfig.phone,
      whatsappNumber: siteConfig.whatsappNumber,
      email: siteConfig.email,
      mapLink: null,
      isPrimary: true,
    };
  }
);

export const getAllShopLocations = cache(
  async (): Promise<ShopLocation[]> =>
    prisma.shopLocation.findMany({ orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] })
);
