import { NextApiRequest, NextApiResponse } from 'next';
import { hash } from 'bcryptjs';
import prisma from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, name, password } = req.body;

  if (!token || !name || !password) {
    return res.status(400).json({ error: 'Token, name, and password are required' });
  }

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invalid invitation token' });
    }

    if (invitation.status !== 'PENDING') {
      return res.status(400).json({ error: 'Invitation has already been used' });
    }

    if (new Date() > invitation.expiresAt) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    const hashedPassword = await hash(password, 12);

    // Create user and update invitation in a transaction
    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          name,
          email: invitation.email,
          password: hashedPassword,
          role: invitation.role,
        },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      }),
    ]);

    return res.status(200).json(user);
  } catch (error) {
    console.error('Failed to accept invitation:', error);
    return res.status(500).json({ error: 'Failed to accept invitation' });
  }
} 