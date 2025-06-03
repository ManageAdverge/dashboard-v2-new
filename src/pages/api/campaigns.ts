import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { GoogleAdsApi } from 'google-ads-api';

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

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  endDate: string | null;
  accountId: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cost: number;
  conversions: number;
  conversionValue: number;
  cpa: number;
  roas: number;
  conversionRate: number;
  sis: number;
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
    const settings = await prisma.globalSettings.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    if (!settings?.selectedGoogleAdsAccountId?.length) {
      return res.status(400).json({ error: 'No Google Ads accounts selected' });
    }

    // Get filters from query params
    const { campaignId, campaignType, campaignStatus, startDate, endDate } = req.query;

    // Build the WHERE clause based on filters
    let whereClause = "WHERE campaign.status != 'REMOVED'";
    if (campaignId) whereClause += ` AND campaign.id = ${campaignId}`;
    // Support multiple campaignType values (array or comma-separated)
    let campaignTypes: string[] = [];
    if (Array.isArray(campaignType)) {
      campaignTypes = campaignType as string[];
    } else if (typeof campaignType === 'string' && campaignType.length > 0) {
      campaignTypes = campaignType.split(',');
    }
    if (campaignTypes.length === 1) {
      whereClause += ` AND campaign.advertising_channel_type = ${campaignTypes[0]}`;
    } else if (campaignTypes.length > 1) {
      whereClause += ` AND campaign.advertising_channel_type IN (${campaignTypes.join(',')})`;
    }
    if (campaignStatus) whereClause += ` AND campaign.status = '${campaignStatus}'`;
    if (startDate) whereClause += ` AND segments.date >= '${startDate}'`;
    if (endDate) whereClause += ` AND segments.date <= '${endDate}'`;

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.advertising_channel_type,
        campaign.status,
        campaign.end_date,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.cost_per_conversion,
        metrics.conversions_from_interactions_rate,
        metrics.search_impression_share
      FROM campaign
      ${whereClause}
    `;

    // Fetch data from all selected accounts
    const allCampaigns = await Promise.all(
      settings.selectedGoogleAdsAccountId.map(async (accountId: string) => {
        const customer = client.Customer({
          customer_id: accountId,
          refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
          login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!,
        });
        try {
          const response = await customer.query(query);
          return response.map((row: any) => ({
            ...row,
            accountId, // Add account ID to each campaign
          }));
        } catch (err: any) {
          // If error is BAD_ENUM_CONSTANT or similar, return empty array
          if (err && err.message && err.message.includes('BAD_ENUM_CONSTANT')) {
            return [];
          }
          throw err;
        }
      })
    );

    // Flatten and process all campaigns
    const typeMap: Record<number, string> = {
      1: 'UNSPECIFIED',
      2: 'SEARCH',
      3: 'DISPLAY',
      4: 'SHOPPING',
      5: 'HOTEL',
      6: 'VIDEO',
      7: 'MULTI_CHANNEL',
      8: 'LOCAL',
      9: 'SMART',
      10: 'PERFORMANCE',
      11: 'LOCAL_SERVICES',
      12: 'DISCOVERY',
      13: 'TRAVEL',
      14: 'APP',
      15: 'PERFORMANCE_MAX',
      16: 'SMART_SHOPPING',
      17: 'APP',
      18: 'LOCAL_CAMPAIGN',
      19: 'SMART_CAMPAIGN',
      20: 'DISCOVERY',
      21: 'DEMAND_GEN',
      28: 'DEMAND_GEN',
    };
    const statusMap: Record<number, string> = {
      2: 'ENABLED',
      3: 'PAUSED',
      4: 'REMOVED',
      5: 'ENDED',
      6: 'DRAFT',
    };

    const campaigns = allCampaigns.flat().map((row: any) => {
      const m = row.metrics;
      return {
        id: row.campaign.id,
        name: row.campaign.name,
        type: typeMap[row.campaign.advertising_channel_type] || 'UNKNOWN',
        status: statusMap[row.campaign.status] || String(row.campaign.status),
        endDate: row.campaign.end_date,
        accountId: row.accountId, // Include account ID in response
        impressions: Number(m.impressions) || 0,
        clicks: Number(m.clicks) || 0,
        ctr: Number(m.ctr) || 0,
        cpc: Number(m.average_cpc) / 1000000 || 0,
        cost: Number(m.cost_micros) / 1000000 || 0,
        conversions: Number(m.conversions) || 0,
        conversionValue: Number(m.conversions_value) || 0,
        cpa: Number(m.cost_per_conversion) / 1000000 || 0,
        roas: Number(m.conversions_value) / (Number(m.cost_micros) / 1000000) || 0,
        conversionRate: Number(m.conversions_from_interactions_rate) * 100 || 0,
        sis: Number(m.search_impression_share) * 100 || 0,
      };
    });

    let filteredCampaigns = campaigns;
    if (campaignStatus === 'ENABLED') {
      const today = new Date();
      filteredCampaigns = campaigns.filter((c: Campaign) => {
        if (!c.endDate) return true;
        // Google Ads end_date is YYYY-MM-DD
        const end = new Date(c.endDate + 'T23:59:59Z');
        return end >= today;
      });
    }
    return res.json(filteredCampaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
} 