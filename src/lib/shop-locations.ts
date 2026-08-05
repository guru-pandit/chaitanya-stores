import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site-config";
import type { ShopLocation } from "@/generated/prisma/client";

export type PrimaryShopLocation = ShopLocation | (Omit<ShopLocation, "id" | "createdAt" | "updatedAt"> & {
  id: null;
});

// Falls back to the env-var contact details (src/lib/site-config.ts) until
// the admin has added at least one ShopLocation row, so the site never
// breaks between this shipping and that first admin action.
export async function getPrimaryShopLocation(): Promise<PrimaryShopLocation> {
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
    isPrimary: true,
  };
}

export async function getAllShopLocations(): Promise<ShopLocation[]> {
  return prisma.shopLocation.findMany({ orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] });
}
