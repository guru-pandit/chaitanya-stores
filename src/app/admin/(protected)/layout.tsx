import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SessionProvider } from "@/components/admin/SessionProvider";
import { QueryProvider } from "@/components/admin/QueryProvider";
import { AdminShell } from "@/components/admin/AdminShell";

// Every page under this layout is an authenticated admin page needing live
// per-request data — forcing the whole subtree dynamic here (it propagates
// to every nested route, same pattern as src/app/(site)/layout.tsx) stops
// Next from statically prerendering any of them at build time.
export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  // Defense-in-depth: /admin/* is already gated by src/proxy.ts edge
  // middleware, but that makes it the sole point of failure for keeping
  // unauthenticated visitors out. Re-checking the session here means a
  // middleware misconfiguration/bypass doesn't silently drop straight
  // through to protected pages.
  const session = await auth();
  if (!session) redirect("/admin/login");

  return (
    <SessionProvider>
      <QueryProvider>
        <AdminShell>{children}</AdminShell>
      </QueryProvider>
    </SessionProvider>
  );
}
