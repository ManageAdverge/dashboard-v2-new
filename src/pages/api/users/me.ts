import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { hash, compare } from 'bcryptjs';
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

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, currentPassword, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || '' },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password if trying to change email or password
    if ((email !== user.email || newPassword) && currentPassword) {
      const isValid = await compare(currentPassword, user.password || '');
      if (!isValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    // Check if new email is already taken
    if (email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already taken' });
      }
    }

    // Prepare update data
    const updateData: any = {
      name,
      email,
    };

    // Only hash and update password if a new one is provided
    if (newPassword) {
      updateData.password = await hash(newPassword, 12);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Failed to update user:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
} 