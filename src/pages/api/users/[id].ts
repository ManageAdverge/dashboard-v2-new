import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { hash } from 'bcryptjs';
import prisma from '../../../lib/prisma';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow admin users to access this endpoint
  if ((session.user as any).role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (req.method === 'PUT') {
    const { name, email, password, role } = req.body;

    try {
      if (email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email,
            NOT: {
              id,
            },
          },
        });

        if (existingUser) {
          return res.status(400).json({ error: 'Email already exists' });
        }
      }

      const updateData: any = {
        name,
        email,
        role,
      };

      if (password) {
        updateData.password = await hash(password, 12);
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      return res.status(200).json(user);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update user' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.user.delete({
        where: { id },
      });

      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 