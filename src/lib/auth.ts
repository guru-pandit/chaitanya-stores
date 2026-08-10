import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { isLoginLocked, recordLoginFailure, recordLoginSuccess } from "@/lib/login-throttle";

// Deliberate throwaway constant — NOT a real credential, does not
// correspond to any actual account. A bcrypt hash (cost 10, matching
// prisma/seed.ts's `bcrypt.hash(password, 10)`) of an arbitrary placeholder
// string, generated once offline and hardcoded here. Its only purpose is
// to give the "user not found" branch of authorize() something to run
// bcrypt.compare() against below, so that branch costs roughly the same
// wall-clock time as the "user found, wrong password" branch (Phase 4
// audit finding #8 — login timing side-channel / user-enumeration risk).
const DUMMY_BCRYPT_HASH = "$2b$10$jEfwbRxpEXiOhvtcFn8m3eSeJOqSEUvyJ8fn9GZ/gApUzbCQ61Azi";

// Exported (rather than inlined in the Credentials provider config below)
// so it's independently unit-testable without spinning up NextAuth itself
// — see auth.test.ts.
export async function authorize(credentials: unknown) {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const { email, password } = parsed.data;

  // A locked-out email still runs the same dummy bcrypt.compare as the
  // "user not found" branch below before returning — otherwise this branch
  // would answer measurably faster than every other failure path (no DB
  // query, no bcrypt), reintroducing a weaker version of the timing
  // side-channel the dummy-compare closed for those paths (Phase 4 audit
  // finding #8). Deliberately skips the DB lookup itself: that's the actual
  // cost this branch is short-circuiting, and it's already-known-invalid
  // per-email state, not user-existence, so skipping only that part leaks
  // nothing new.
  if (isLoginLocked(email)) {
    await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
    return null;
  }

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) {
    // Run the same bcrypt work a real "wrong password" comparison would
    // do, against the dummy hash above, and discard the result — this is
    // what closes the response-timing gap between "email exists, wrong
    // password" (which always runs bcrypt.compare below) and "email
    // doesn't exist" (which previously returned immediately).
    await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
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
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize,
    }),
  ],
});
