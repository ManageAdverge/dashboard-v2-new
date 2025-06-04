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

// Add early logging for debugging
console.log('NextAuth handler initializing...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Database URL available:', !!process.env.DATABASE_URL);

// Verify Prisma connection
prisma.$connect()
  .then(() => console.log('Prisma connection verified in NextAuth handler'))
  .catch(err => console.error('Prisma connection failed in NextAuth handler:', err));

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
        try {
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
        } catch (err) {
          console.error('NextAuth authorize error:', err);
          throw err;
        }
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

const authHandler: NextApiHandler = async (req, res) => {
  console.log('NextAuth request received:', {
    method: req.method,
    url: req.url,
    headers: {
      host: req.headers.host,
      'user-agent': req.headers['user-agent'],
    },
  });

  try {
    // Verify Prisma connection before handling request
    await prisma.$connect();
    console.log('Prisma connection verified before request handling');
    
    return await NextAuth(authOptions)(req, res);
  } catch (err) {
    console.error('NextAuth top-level error:', {
      error: err,
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
    });
    
    // Send a more detailed error response
    res.status(500).json({
      error: 'Authentication failed',
      message: err instanceof Error ? err.message : 'Internal server error',
      // Only include stack in development
      ...(process.env.NODE_ENV === 'development' && { stack: err instanceof Error ? err.stack : undefined }),
    });
  } finally {
    // Ensure Prisma connection is closed in production
    if (process.env.NODE_ENV === 'production') {
      await prisma.$disconnect();
    }
  }
};

export default authHandler; 