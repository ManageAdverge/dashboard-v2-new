import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
import { getGoogleAdsCampaignTypes } from '../../../lib/googleAds';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the global settings
    const settings = await prisma.globalSettings.findFirst({
      where: { id: 'global' }
    });
    if (!settings?.selectedGoogleAdsAccountId) {
      return res.status(400).json({ error: 'No Google Ads accounts selected' });
    }

    const types = await getGoogleAdsCampaignTypes([settings.selectedGoogleAdsAccountId]);
    return res.status(200).json({ types });
  } catch (error) {
    console.error('Error fetching campaign types:', error);
    return res.status(500).json({ error: 'Failed to fetch campaign types' });
  }
} 