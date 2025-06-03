import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { getGoogleAdsMetrics } from '@/lib/googleAds';

interface Session {
  user: {
    id: string;
    role: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

function serializeError(error: any) {
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return { message: error.message, stack: error.stack };
  try {
    return JSON.parse(JSON.stringify(error));
  } catch {
    return String(error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions) as Session | null;

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the global settings
    const settings = await prisma.globalSettings.findUnique({ where: { id: 'global' } });

    if (!settings?.selectedGoogleAdsAccountId?.length) {
      return res.status(400).json({ error: 'No Google Ads accounts selected' });
    }

    // Get filters from query params
    const { campaignId, campaignType, campaignStatus, startDate, endDate } = req.query;

    const metrics = await getGoogleAdsMetrics(
      settings.selectedGoogleAdsAccountId,
      {
        campaignId: campaignId as string | undefined,
        campaignType: campaignType as string | undefined,
        campaignStatus: campaignStatus as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
      }
    );

    return res.json(metrics);
  } catch (error: any) {
    console.error('Error fetching metrics:', error);
    return res.status(500).json({ error: error?.message || JSON.stringify(error) });
  }
} 