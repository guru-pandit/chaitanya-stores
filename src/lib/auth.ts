import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { isLoginLocked, recordLoginFailure, recordLoginSuccess } from "@/lib/login-throttle";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Checked before any DB/bcrypt work so a lockout also short-circuits
        // the expensive path — same generic failure as a wrong password, so
        // an attacker can't distinguish "locked out" from "wrong password".
        if (isLoginLocked(email)) return null;

        const user = await prisma.adminUser.findUnique({ where: { email } });
        if (!user) {
          recordLoginFailure(email);
          return null;
        }

        const isValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isValid) {
          recordLoginFailure(email);
          return null;
        }

        recordLoginSuccess(email);
        return { id: user.id, email: user.email };
      },
    }),
  ],
});
