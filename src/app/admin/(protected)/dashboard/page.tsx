import Link from "next/link";
import { Package, FolderTree, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";

// Route protection for /admin/* is enforced in src/proxy.ts (edge
// middleware), not by a dynamic API call in this Server Component itself —
// without forcing dynamic rendering, Next has no signal that this page's
// Prisma reads shouldn't be frozen at build time, and these stats would
// never update after the first deploy.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [productCount, categoryCount, recentProducts] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.product.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { category: true },
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl text-maroon-dark">Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-maroon/10 bg-white/70 p-5">
          <Package className="text-terracotta" size={28} />
          <div>
            <p className="text-2xl font-semibold text-maroon-dark">{productCount}</p>
            <p className="text-sm text-charcoal/60">Products</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-maroon/10 bg-white/70 p-5">
          <FolderTree className="text-terracotta" size={28} />
          <div>
            <p className="text-2xl font-semibold text-maroon-dark">{categoryCount}</p>
            <p className="text-sm text-charcoal/60">Categories</p>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-maroon/10 bg-white/70 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="text-terracotta" size={18} />
          <h2 className="font-display text-lg text-maroon-dark">Recently Added</h2>
        </div>
        {recentProducts.length ? (
          <ul className="divide-y divide-maroon/10">
            {recentProducts.map((product) => (
              <li key={product.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="font-medium text-maroon-dark hover:text-terracotta"
                  >
                    {product.name}
                  </Link>
                  <p className="text-charcoal/50">{product.category.name}</p>
                </div>
                <span className="text-charcoal/70">{formatPrice(product.price)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-charcoal/60">
            No products yet.{" "}
            <Link href="/admin/products/new" className="text-terracotta hover:underline">
              Add your first product
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
