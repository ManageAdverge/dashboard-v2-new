import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { GoogleAdsApi } from 'google-ads-api';
import { getGoogleAdsMetrics, getGoogleAdsTimeSeries } from '@/lib/googleAds';
import { subYears, format } from 'date-fns';

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
});

interface Session {
  user: {
    id: string;
    role: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions) as Session | null;
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { startDate, endDate, campaignId, campaignType, campaignStatus } = req.query;

    // Get the global settings
    const settings = await prisma.globalSettings.findUnique({ where: { id: 'global' } });
    if (!settings?.selectedGoogleAdsAccountId?.length) {
      return res.status(400).json({ message: 'No Google Ads accounts selected' });
    }

    // Get current period time series
    const { timeSeries: currentSeries, currency, timeZone } = await getGoogleAdsTimeSeries(
      settings.selectedGoogleAdsAccountId,
      {
        startDate: startDate as string,
        endDate: endDate as string,
        campaignId: campaignId as string,
        campaignType: campaignType as string,
        campaignStatus: campaignStatus as string,
      }
    );

    // Calculate YoY period
    const currentStartDate = new Date(startDate as string);
    const currentEndDate = new Date(endDate as string);
    const previousStartDate = subYears(currentStartDate, 1);
    const previousEndDate = subYears(currentEndDate, 1);

    // Get YoY time series
    const { timeSeries: previousSeries } = await getGoogleAdsTimeSeries(
      settings.selectedGoogleAdsAccountId,
      {
        startDate: format(previousStartDate, 'yyyy-MM-dd'),
        endDate: format(previousEndDate, 'yyyy-MM-dd'),
        campaignId: campaignId as string,
        campaignType: campaignType as string,
        campaignStatus: campaignStatus as string,
      }
    );

    // Build metrics array for frontend
    const metrics = [
      {
        title: 'Impressions',
        current: currentSeries.map(d => d.impressions),
        previous: previousSeries.map(d => d.impressions),
        labels: currentSeries.map(d => d.date),
        previousLabels: previousSeries.map(d => d.date),
      },
      {
        title: 'Clicks',
        current: currentSeries.map(d => d.clicks),
        previous: previousSeries.map(d => d.clicks),
        labels: currentSeries.map(d => d.date),
        previousLabels: previousSeries.map(d => d.date),
      },
      {
        title: 'CTR',
        current: currentSeries.map(d => (d.clicks / d.impressions) * 100),
        previous: previousSeries.map(d => (d.clicks / d.impressions) * 100),
        labels: currentSeries.map(d => d.date),
        previousLabels: previousSeries.map(d => d.date),
      },
      {
        title: 'Costs',
        current: currentSeries.map(d => d.cost),
        previous: previousSeries.map(d => d.cost),
        labels: currentSeries.map(d => d.date),
        previousLabels: previousSeries.map(d => d.date),
      },
      {
        title: 'Conversions',
        current: currentSeries.map(d => d.conversions),
        previous: previousSeries.map(d => d.conversions),
        labels: currentSeries.map(d => d.date),
        previousLabels: previousSeries.map(d => d.date),
      },
      {
        title: 'Cost per Conversion',
        current: currentSeries.map(d => d.cpa),
        previous: previousSeries.map(d => d.cpa),
        labels: currentSeries.map(d => d.date),
        previousLabels: previousSeries.map(d => d.date),
      },
      {
        title: 'Conversion Rate',
        current: currentSeries.map(d => d.conversionRate),
        previous: previousSeries.map(d => d.conversionRate),
        labels: currentSeries.map(d => d.date),
        previousLabels: previousSeries.map(d => d.date),
      },
      {
        title: 'Conversion Value',
        current: currentSeries.map(d => d.conversionValue),
        previous: previousSeries.map(d => d.conversionValue),
        labels: currentSeries.map(d => d.date),
        previousLabels: previousSeries.map(d => d.date),
      },
      {
        title: 'Conversion Value / Costs (ROAS)',
        current: currentSeries.map(d => d.roas),
        previous: previousSeries.map(d => d.roas),
        labels: currentSeries.map(d => d.date),
        previousLabels: previousSeries.map(d => d.date),
      },
    ];

    return res.json({ metrics, currency, timeZone });
  } catch (error) {
    console.error('Error fetching trends:', error);
    return res.status(500).json({ error: 'Failed to fetch trends data' });
  }
} 