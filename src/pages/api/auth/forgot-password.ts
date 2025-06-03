import { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import prisma from '../../../lib/prisma';
import { randomBytes } from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return res.status(200).json({ message: 'If an account exists, you will receive a password reset email' });
    }

    // Generate a random token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Create password reset token
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expires: expiresAt,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_BASE_URL environment variable is not set');
    }

    // Send email
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;
    
    try {
      await resend.emails.send({
        from: 'noreply@dashboard.adverge.com',
        to: email,
        subject: 'Reset your password',
        html: `
          <p>Hello,</p>
          <p>You requested to reset your password. Click the link below to reset it:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Delete the token if email sending fails
      await prisma.passwordResetToken.delete({
        where: { token },
      });
      throw new Error('Failed to send reset email');
    }

    return res.status(200).json({ message: 'If an account exists, you will receive a password reset email' });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Something went wrong' });
  }
} 