import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInvitationEmail(email: string, token: string) {
  console.log('Attempting to send invitation email to:', email);
  console.log('RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const inviteUrl = `${baseUrl}/auth/accept-invitation?token=${token}`;
  
  console.log('Invitation URL:', inviteUrl);

  try {
    const result = await resend.emails.send({
      from: 'noreply@dashboard.adverge.com',
      to: email,
      subject: 'You have been invited to join the dashboard',
      html: `
        <h1>Welcome to the Dashboard!</h1>
        <p>You have been invited to join our dashboard. Click the link below to accept the invitation and set up your account:</p>
        <p><a href="${inviteUrl}">Accept Invitation</a></p>
        <p>This invitation link will expire in 7 days.</p>
        <p>If you did not request this invitation, please ignore this email.</p>
      `,
    });
    
    console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    throw new Error('Failed to send invitation email');
  }
} 