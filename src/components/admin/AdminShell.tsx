"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Package, FolderTree, Image as ImageIcon, MapPin, PartyPopper, MessageSquare, LogOut, Menu, X } from "lucide-react";
import { useMobileNavStore } from "@/store/mobileNavStore";

const navLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/shop-locations", label: "Shop Locations", icon: MapPin },
  { href: "/admin/festival-banner", label: "Festival Banner", icon: PartyPopper },
  { href: "/admin/hero-images", label: "Hero Images", icon: ImageIcon },
  { href: "/admin/enquiries", label: "Enquiries", icon: MessageSquare },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isOpen, toggle, close } = useMobileNavStore();

  return (
    <div className="flex h-dvh overflow-hidden bg-cream">
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 shrink-0 flex-col overflow-y-auto border-r border-maroon/10 bg-white/80 backdrop-blur transition-transform sm:static sm:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-maroon/10 px-5 py-5">
          <Image src="/logo.png" alt="" width={24} height={24} className="shrink-0" />
          <span className="font-display text-lg text-maroon-dark">Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-terracotta/10 text-terracotta" : "text-charcoal/80 hover:bg-cream-dark/60"
                }`}
              >
                <Icon size={18} /> {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-maroon/10 p-3">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-maroon hover:bg-cream-dark/60"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-maroon/10 bg-white/60 px-4 py-3 sm:hidden">
          <span className="font-display text-lg text-maroon-dark">Admin</span>
          <button type="button" onClick={toggle} className="text-maroon" aria-label="Toggle menu">
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
