import { NextApiRequest, NextApiResponse } from 'next';
import { getGoogleAdsMetrics } from '../../../lib/googleAds';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { campaignId, campaignType, campaignStatus, startDate, endDate } = req.query;
    const customerIds = (req.query.customerIds as string)?.split(',').filter(Boolean) || [];

    const metrics = await getGoogleAdsMetrics(customerIds, {
      campaignId: campaignId as string,
      campaignType: campaignType as string,
      campaignStatus: campaignStatus as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return res.status(200).json(metrics);
  } catch (error) {
    let message = '';
    if (error instanceof Error) {
      message = error.stack || error.message;
    } else if (typeof error === 'object') {
      message = JSON.stringify(error);
    } else {
      message = String(error);
    }
    console.error('Error fetching metrics:', message);
    return res.status(500).json({ error: message });
  }
} 