import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { GoogleAdsApi } from 'google-ads-api';
import { toZonedTime } from 'date-fns-tz';

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
});

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
    const settings = await prisma.globalSettings.findUnique({ where: { id: 'global' } });
    if (!settings?.selectedGoogleAdsAccountId?.length) {
      return res.status(400).json({ error: 'No Google Ads accounts selected' });
    }

    // Fetch timezone directly from Google Ads API for the selected account
    const customer = client.Customer({
      customer_id: settings.selectedGoogleAdsAccountId[0],
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!,
    });

    // Fetch account info for currency and time zone
    const accountInfoQuery = `SELECT customer.currency_code, customer.time_zone FROM customer LIMIT 1`;
    const accountInfo = await customer.query(accountInfoQuery);
    const currency = accountInfo[0]?.customer?.currency_code || 'USD';
    const timeZone = accountInfo[0]?.customer?.time_zone || 'UTC';
    const now = toZonedTime(new Date(), timeZone);

    // Always use current month for budget and costs
    const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(now), 'yyyy-MM-dd');
    const currentMonth = format(now, 'MMMM');

    const budgets = await prisma.globalBudget.findMany({
      where: { month: currentMonth },
    });
    const totalBudget = budgets.reduce((sum, budget) => sum + budget.value, 0);

    // Get current month's costs from Google Ads for all selected accounts
    const query = `SELECT metrics.cost_micros FROM campaign WHERE segments.date BETWEEN "${startDate}" AND "${endDate}"`;
    let currentCosts = 0;
    for (const accountId of settings.selectedGoogleAdsAccountId) {
      const customer = client.Customer({
        customer_id: accountId,
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
        login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!,
      });
      const costs = await customer.query(query);
      currentCosts += Array.isArray(costs)
        ? costs.reduce((sum: number, row: any) => sum + (Number(row.metrics.cost_micros) / 1000000), 0)
        : 0;
    }

    return res.json({
      currentCosts,
      totalBudget,
      currency,
    });
  } catch (error) {
    console.error('Budget progress API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch budget progress',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 