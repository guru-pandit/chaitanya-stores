import { SessionProvider } from "@/components/admin/SessionProvider";
import { QueryProvider } from "@/components/admin/QueryProvider";
import { AdminShell } from "@/components/admin/AdminShell";

// Every page under this layout is an authenticated admin page needing live
// per-request data — forcing the whole subtree dynamic here (it propagates
// to every nested route, same pattern as src/app/(site)/layout.tsx) stops
// Next from statically prerendering any of them at build time.
export const dynamic = "force-dynamic";

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <AdminShell>{children}</AdminShell>
      </QueryProvider>
    </SessionProvider>
  );
}
