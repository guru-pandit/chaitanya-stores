"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import type { Category } from "@/generated/prisma/client";
import { useState } from "react";
import { Select } from "@/components/ui/Select";

export function ProductFilters({
  categories,
  brands,
  activeCategory,
  activeBrand,
  activeQuery,
}: {
  categories: Category[];
  brands: string[];
  activeCategory: string;
  activeBrand: string;
  activeQuery: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(activeQuery);

  function updateParams(next: { category?: string; brand?: string; q?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateParams({ q: query });
        }}
        className="relative flex-1"
      >
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the catalog..."
          aria-label="Search the catalog"
          className="w-full rounded-full border border-maroon/20 bg-white/70 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-terracotta"
        />
      </form>

      <Select
        value={activeCategory}
        onChange={(e) => updateParams({ category: e.target.value })}
        wrapperClassName="sm:w-48"
        className="rounded-full border border-maroon/20 bg-white/70 py-2.5 pl-4 text-sm outline-none focus:border-terracotta"
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>
            {c.name}
          </option>
        ))}
      </Select>

      <Select
        value={activeBrand}
        onChange={(e) => updateParams({ brand: e.target.value })}
        wrapperClassName="sm:w-48"
        className="rounded-full border border-maroon/20 bg-white/70 py-2.5 pl-4 text-sm outline-none focus:border-terracotta"
      >
        <option value="">All Brands</option>
        {brands.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </Select>
    </div>
  );
}
