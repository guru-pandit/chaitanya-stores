import { Header } from "@/components/site/Header";
import { NotFoundContent } from "@/components/site/NotFoundContent";

// This file doubles as Next's automatically-generated global 404 fallback,
// which it always statically prerenders at build time — unlike an ordinary
// page, a `dynamic = "force-dynamic"` export here does not opt it out of
// that. So unlike src/app/(site)/layout.tsx (which can safely force-dynamic
// its live-data Footer), this page must not depend on live DB reads at all;
// Header is static/config-driven and safe, but Footer reads shop locations
// via Prisma and would crash the build the moment the DB is unreachable at
// build time (e.g. the Docker builder stage's intentionally fake
// DATABASE_URL). Deliberately left out.
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <NotFoundContent />
      </main>
    </>
  );
}
