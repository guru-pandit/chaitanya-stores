import Link from "next/link";
import Image from "next/image";
import { MandalaDivider } from "./MandalaDivider";

export function NotFoundContent() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <Image src="/logo.png" alt="" width={44} height={44} className="opacity-40" />
      <h1 className="mt-4 font-display text-3xl text-maroon-dark">Page Not Found</h1>
      <MandalaDivider className="my-6" />
      <p className="text-charcoal/70">
        The page you are looking for does not exist, or the product/category may no longer be
        available.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-terracotta px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-terracotta-dark"
        >
          Back to Home
        </Link>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 rounded-full border border-maroon/30 px-6 py-3 text-sm font-medium text-maroon transition-colors hover:bg-maroon/5"
        >
          Browse Catalog
        </Link>
      </div>
    </div>
  );
}
