import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import DiscordProvider from "next-auth/providers/discord";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import { db } from "~/server/db";
import { env } from "~/env";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      username: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  interface JWT {
    username?: string;
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          image: user.image,
        };
      },
    }),
    ...(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
      ? [
          GoogleProvider({
            clientId: env.AUTH_GOOGLE_ID,
            clientSecret: env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
    ...(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET
      ? [
          GitHubProvider({
            clientId: env.AUTH_GITHUB_ID,
            clientSecret: env.AUTH_GITHUB_SECRET,
          }),
        ]
      : []),
    ...(env.AUTH_DISCORD_ID && env.AUTH_DISCORD_SECRET
      ? [
          DiscordProvider({
            clientId: env.AUTH_DISCORD_ID,
            clientSecret: env.AUTH_DISCORD_SECRET,
          }),
        ]
      : []),
  ],
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // If redirecting to baseUrl or root, send to hub
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/hub`;
      }
      // Otherwise use the provided URL
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      // Default to hub if no valid URL provided
      return `${baseUrl}/hub`;
    },
    async session({ session, token }) {
      // If token is null (user doesn't exist in DB), invalidate session
      if (!token || !token.sub) {
        return null as any;
      }

      // Verify user still exists in database
      const dbUser = await db.user.findUnique({
        where: { id: token.sub as string },
        select: { id: true },
      });

      // If user doesn't exist (e.g., after database reset), invalidate session
      if (!dbUser) {
        return null as any;
      }

      if (session.user) {
        session.user.id = token.sub as string;
      }
      if (token.username && session.user) {
        session.user.username = token.username as string;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
        // Fetch username from database using user id
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { username: true },
        });
        if (dbUser) {
          token.username = dbUser.username;
        }
      } else if (token.sub) {
        // On subsequent requests, verify the user still exists in the database
        // This handles cases where the database was reset but the JWT token is still valid
        const dbUser = await db.user.findUnique({
          where: { id: token.sub as string },
          select: { username: true },
        });
        if (!dbUser) {
          // User doesn't exist anymore, invalidate the token by returning null
          // This will cause the session callback to also return null
          return null as any;
        }
        // Update username if it changed
        if (dbUser.username) {
          token.username = dbUser.username;
        }
      }
      return token;
    },
  },
} satisfies NextAuthConfig;
