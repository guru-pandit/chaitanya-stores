"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useProducts } from "@/hooks/products/useProducts";
import { useDeleteProduct } from "@/hooks/products/useProductMutations";
import { useCategories } from "@/hooks/categories/useCategories";
import { useBrands } from "@/hooks/products/useBrands";
import { useAdminProductFiltersStore } from "@/store/adminProductFiltersStore";
import { useDeleteWithConfirm } from "@/hooks/useDeleteWithConfirm";
import { formatPrice, formatVariantPrice } from "@/lib/format";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { RowActions } from "@/components/admin/RowActions";
import { Select } from "@/components/ui/Select";
import type { ProductWithCategory } from "@/hooks/products/useProducts";

// Route protection for /admin/* is enforced in src/proxy.ts (edge
// middleware), not by a dynamic API call in this Server Component itself —
// without forcing dynamic rendering, Next tries to statically prerender this
// admin page at build time and fails.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default function AdminProductsPage() {
  const { categoryId, brand, search, setCategoryId, setBrand, setSearch } =
    useAdminProductFiltersStore();
  const [page, setPage] = useState(1);
  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.items;
  const { data: brands } = useBrands();
  const { data, isLoading } = useProducts({ categoryId, brand, q: search, page, limit: PAGE_SIZE });
  const products = data?.items;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const { mutate: deleteProduct, isPending } = useDeleteProduct();
  const { confirmDelete, pendingId } = useDeleteWithConfirm(deleteProduct);

  // Filter changes should reset to page 1 — the currently viewed page
  // number from a different filter set has no meaning under a new one.
  // Adjusted directly during render (React's documented pattern for
  // resetting state on a prop/input change) rather than in a useEffect,
  // which would cause an extra render pass.
  const [prevFilterKey, setPrevFilterKey] = useState(`${categoryId}|${brand}|${search}`);
  const filterKey = `${categoryId}|${brand}|${search}`;
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const columns: DataTableColumn<ProductWithCategory>[] = [
    {
      header: "Name",
      cell: (product) => (
        <span className="font-medium text-maroon-dark">
          {product.name}
          {product.featured && (
            <span className="ml-2 rounded-full bg-gold/30 px-2 py-0.5 text-[10px] font-semibold text-maroon-dark">
              Featured
            </span>
          )}
        </span>
      ),
    },
    { header: "Brand", cell: (product) => <span className="text-charcoal/70">{product.brand}</span> },
    {
      header: "Category",
      cell: (product) => <span className="text-charcoal/70">{product.category.name}</span>,
    },
    {
      header: "Weight",
      cell: (product) => (
        <span className="text-charcoal/70">
          {product.variants.length > 0
            ? `${product.variants.length} option${product.variants.length === 1 ? "" : "s"}`
            : product.weight || "—"}
        </span>
      ),
    },
    {
      header: "Price",
      cell: (product) => (
        <span className="text-charcoal/70">
          {product.variants.length > 0 ? formatVariantPrice(product.variants) : formatPrice(product.price)}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (product) => (
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            product.inStock ? "bg-green-100 text-green-800" : "bg-charcoal/10 text-charcoal/60"
          }`}
        >
          {product.inStock ? "In Stock" : "Out of Stock"}
        </span>
      ),
    },
    {
      header: "Actions",
      headerClassName: "text-right",
      cellClassName: "text-right",
      cell: (product) => (
        <RowActions
          editHref={`/admin/products/${product.id}/edit`}
          label={product.name}
          onDelete={() => confirmDelete(product.id, product.name)}
          deleting={isPending && pendingId === product.id}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl text-maroon-dark">Products</h1>
        <LinkButton href="/admin/products/new" variant="primary">
          <Plus size={16} /> New Product
        </LinkButton>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-full border border-maroon/20 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-terracotta"
          />
        </div>
        <Select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          wrapperClassName="sm:w-48"
          className="rounded-full border border-maroon/20 bg-white py-2.5 pl-4 text-sm outline-none focus:border-terracotta"
        >
          <option value="">All Categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          wrapperClassName="sm:w-48"
          className="rounded-full border border-maroon/20 bg-white py-2.5 pl-4 text-sm outline-none focus:border-terracotta"
        >
          <option value="">All Brands</option>
          {brands?.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-maroon/10 bg-white/70">
        <DataTable
          columns={columns}
          data={products}
          getRowKey={(product) => product.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              title="No products found"
              description="Try a different search or filter, or add your first product."
              action={
                <LinkButton href="/admin/products/new" variant="primary" className="mt-2">
                  <Plus size={16} /> New Product
                </LinkButton>
              }
            />
          }
        />
        {products && products.length > 0 && (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}
