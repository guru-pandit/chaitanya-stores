import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  // nginx is the sole public entry point and forwards the real Host header
  // itself (`proxy_set_header Host $host` in
  // nginx/templates/default.conf.template) — there's no path for a client
  // to spoof the host through to the app, so trusting it here is safe.
  // Without this, Auth.js v5 rejects requests behind a reverse proxy with
  // "UntrustedHost" (e.g. on /api/auth/session).
  trustHost: true,
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/admin/login";

      if (isLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/admin/dashboard", nextUrl));
        return true;
      }
      return isLoggedIn;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
