import { SessionProvider } from "@/components/admin/SessionProvider";
import { QueryProvider } from "@/components/admin/QueryProvider";
import { AdminShell } from "@/components/admin/AdminShell";

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <AdminShell>{children}</AdminShell>
      </QueryProvider>
    </SessionProvider>
  );
}
