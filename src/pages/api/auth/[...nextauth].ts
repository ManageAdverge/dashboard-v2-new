/*
  Project State (as of last edit):
  - All PrismaClient imports now use @prisma/client, no more prisma/generated/client anywhere in code.
  - All API routes, including this one, use the correct prisma import from lib/prisma.
  - Prisma schema and seed scripts are up to date and work locally.
  - Vercel deploys are broken: build fails with stale reference to prisma/generated/client, even after all code and build artifacts were cleaned.
  - Multiple attempts to clear Vercel cache, delete .next, and remove prisma/generated from repo did not resolve the issue.
  - Local build and seed work, but production is blocked on Vercel deployment/caching issue.
  - Next step for any new dev: try a fresh Vercel project, or escalate to Vercel support.
*/
import { NextApiHandler } from 'next';
import NextAuth, { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '../../../lib/prisma';
import { compare } from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user.password) {
          throw new Error('No user found with this email');
        }

        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};

const authHandler: NextApiHandler = NextAuth(authOptions);
export default authHandler; 