import NextAuth from "next-auth";
import { cache } from "react";

import { authConfig } from "./config";

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

const auth = cache(uncachedAuth);

/**
 * Server-side session helper for NextAuth v5.
 * Use this in server components and API routes to get the current session.
 *
 * @example
 * ```ts
 * const session = await getServerAuthSession();
 * if (!session?.user) {
 *   redirect('/auth/signin');
 * }
 * ```
 */
export const getServerAuthSession = async () => {
  return await auth();
};

export { auth, handlers, signIn, signOut };
