"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  children,
  mobile = false,
}: {
  href: string;
  children: React.ReactNode;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={
        mobile
          ? `rounded-lg px-3 py-2.5 text-sm font-medium ${
              active ? "bg-terracotta/10 text-terracotta" : "text-charcoal/80"
            }`
          : `text-sm font-medium transition-colors hover:text-terracotta ${
              active ? "text-terracotta" : "text-charcoal/80"
            }`
      }
    >
      {children}
    </Link>
  );
}
