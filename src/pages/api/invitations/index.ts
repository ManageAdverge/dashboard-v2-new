import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { randomBytes } from 'crypto';
import prisma from '../../../lib/prisma';
import { authOptions } from '../auth/[...nextauth]';
import { sendInvitationEmail } from '../../../lib/email';

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

  if (req.method === 'POST') {
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Generate invitation token
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days

      // Create invitation
      const invitation = await prisma.invitation.create({
        data: {
          email,
          token,
          role: role || 'USER',
          expiresAt,
        },
      });

      // Send invitation email
      await sendInvitationEmail(email, token);

      return res.status(201).json(invitation);
    } catch (error) {
      console.error('Failed to create invitation:', error);
      return res.status(500).json({ error: 'Failed to create invitation' });
    }
  }

  if (req.method === 'GET') {
    try {
      const invitations = await prisma.invitation.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });
      return res.status(200).json(invitations);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch invitations' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 