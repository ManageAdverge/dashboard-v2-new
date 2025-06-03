import { GoogleAdsApi } from 'google-ads-api';
import { eachDayOfInterval, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
});

interface GoogleAdsMetrics {
  impressions: number;
  search_impression_share: number;
  clicks: number;
  ctr: number;
  average_cpc: number;
  cost_micros: number;
  conversions: number;
  cost_per_conversion: number;
  conversions_from_interactions_rate: number;
  conversions_value: number;
}

interface GoogleAdsMetricsFilters {
  campaignId?: string;
  campaignType?: string;
  campaignStatus?: string;
  startDate?: string;
  endDate?: string;
}

export async function getGoogleAdsMetrics(customerIds: string[], filters: GoogleAdsMetricsFilters = {}) {
  try {
    if (!customerIds.length) {
      return {
        impressions: 0,
        sis: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        cost: 0,
        conversions: 0,
        cpa: 0,
        conversionRate: 0,
        conversionValue: 0,
        roas: 0,
        currency: 'USD',
        timeZone: 'UTC',
      };
    }

    // Always fetch timezone and currency from Google Ads API for each account
    const results = await Promise.all(
      customerIds.map(async (customerId) => {
        const customer = client.Customer({
          customer_id: customerId,
          refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
          login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!,
        });

        // Fetch account info for currency and time zone
        const accountInfoQuery = `
          SELECT customer.currency_code, customer.time_zone FROM customer LIMIT 1
        `;
        const accountInfo = await customer.query(accountInfoQuery);
        const currency = accountInfo[0]?.customer?.currency_code || 'USD';
        const timeZone = accountInfo[0]?.customer?.time_zone || 'UTC';

        // Build WHERE clause
        const where: string[] = ["campaign.status != 'REMOVED'"]; // Exclude REMOVED
        if (filters.campaignId) where.push(`campaign.id = '${filters.campaignId}'`);
        if (filters.campaignType) where.push(`campaign.advertising_channel_type = '${filters.campaignType}'`);
        if (filters.campaignStatus) {
          switch (filters.campaignStatus) {
            case 'ENABLED':
              where.push("campaign.status = 'ENABLED'");
              break;
            case 'PAUSED':
              where.push("campaign.status = 'PAUSED'");
              break;
            case 'ENDED':
              where.push("campaign.status = 'ENDED'");
              break;
            case 'DRAFT':
              where.push("campaign.status = 'DRAFT'");
              break;
            default:
              where.push(`campaign.status = '${filters.campaignStatus}'`);
          }
        }
        if (filters.startDate && filters.endDate) {
          // Ensure dates are in the account's timezone
          const startDate = formatInTimeZone(new Date(filters.startDate), timeZone, 'yyyy-MM-dd');
          const endDate = formatInTimeZone(new Date(filters.endDate), timeZone, 'yyyy-MM-dd');
          console.log('==================== [DashboardMetrics] DATE DEBUG ====================');
          console.log('[DashboardMetrics] Using timezone:', timeZone);
          console.log('[DashboardMetrics] Date range from frontend:', { startDate: filters.startDate, endDate: filters.endDate });
          console.log('[DashboardMetrics] Formatted for GAQL:', { startDate, endDate });
          console.log('=======================================================================');
          where.push(`segments.date BETWEEN '${startDate}' AND '${endDate}'`);
        } else {
          where.push(`segments.date DURING LAST_30_DAYS`);
        }

        const query = `
          SELECT
            campaign.id,
            campaign.end_date,
            segments.date,
            metrics.impressions,
            metrics.search_impression_share,
            metrics.clicks,
            metrics.ctr,
            metrics.average_cpc,
            metrics.cost_micros,
            metrics.conversions,
            metrics.cost_per_conversion,
            metrics.conversions_from_interactions_rate,
            metrics.conversions_value
          FROM campaign
          WHERE ${where.join(' AND ')}
        `;

        console.log('[DashboardMetrics] GAQL Query:', query);
        const response = await customer.query(query);
        // console.log('[DashboardMetrics] Raw response:', response); // Commented out to reduce noise
        return { response, currency, timeZone };
      })
    );

    // Aggregate results from all accounts
    let allRows = results.flatMap(({ response }) => response);
    // If filtering for ENABLED, filter out campaigns with end_date < today
    if (filters.campaignStatus === 'ENABLED') {
      const today = new Date();
      allRows = allRows.filter(row => {
        if (!row.campaign) return false;
        const endDate = row.campaign.end_date;
        if (!endDate) return true;
        const end = new Date(endDate + 'T23:59:59Z');
        return end >= today;
      });
    }
    // Now aggregate metrics from allRows
    let totals = {
      impressions: 0,
      clicks: 0,
      cost_micros: 0,
      conversions: 0,
      conversions_value: 0,
      search_impression_share: 0,
      ctr: 0,
      average_cpc: 0,
      cost_per_conversion: 0,
      conversions_from_interactions_rate: 0,
      count: 0,
    };
    allRows.forEach((row: any) => {
      const m = row.metrics;
      totals.impressions += Number(m.impressions) || 0;
      totals.clicks += Number(m.clicks) || 0;
      totals.cost_micros += Number(m.cost_micros) || 0;
      totals.conversions += Number(m.conversions) || 0;
      totals.conversions_value += Number(m.conversions_value) || 0;
      totals.search_impression_share += Number(m.search_impression_share) || 0;
      totals.ctr += Number(m.ctr) || 0;
      totals.average_cpc += Number(m.average_cpc) || 0;
      totals.cost_per_conversion += Number(m.cost_per_conversion) || 0;
      totals.conversions_from_interactions_rate += Number(m.conversions_from_interactions_rate) || 0;
      totals.count++;
    });

    console.log('[DashboardMetrics] Aggregated cost:', totals.cost_micros / 1000000);
    // Use the currency and timezone from the first account
    const { currency, timeZone } = results[0];

    return {
      impressions: totals.impressions,
      sis: totals.count ? (totals.search_impression_share / totals.count) * 100 : 0,
      clicks: totals.clicks,
      ctr: totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0,
      cpc: totals.clicks ? totals.cost_micros / totals.clicks / 1000000 : 0,
      cost: totals.cost_micros / 1000000,
      conversions: totals.conversions,
      cpa: totals.conversions ? totals.cost_micros / totals.conversions / 1000000 : 0,
      conversionRate: totals.clicks ? (totals.conversions / totals.clicks) * 100 : 0,
      conversionValue: totals.conversions_value,
      roas: totals.cost_micros ? totals.conversions_value / (totals.cost_micros / 1000000) : 0,
      currency,
      timeZone,
    };
  } catch (error) {
    console.error('Error fetching Google Ads metrics:', error);
    throw error;
  }
}

export async function getGoogleAdsTimeSeries(customerIds: string[], filters: GoogleAdsMetricsFilters = {}) {
  try {
    if (!customerIds.length) {
      return {
        timeSeries: [],
        currency: 'USD',
        timeZone: 'UTC'
      };
    }

    // Always fetch timezone and currency from Google Ads API for each account
    const results = await Promise.all(
      customerIds.map(async (customerId) => {
        const customer = client.Customer({
          customer_id: customerId,
          refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
          login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!,
        });

        // Fetch account info for currency and time zone
        const accountInfoQuery = `
          SELECT customer.currency_code, customer.time_zone FROM customer LIMIT 1
        `;
        const accountInfo = await customer.query(accountInfoQuery);
        const currency = accountInfo[0]?.customer?.currency_code || 'USD';
        const timeZone = accountInfo[0]?.customer?.time_zone || 'UTC';

        // Build WHERE clause
        const where: string[] = ["campaign.status != 'REMOVED'"]; // Exclude REMOVED
        if (filters.campaignId) where.push(`campaign.id = '${filters.campaignId}'`);
        if (filters.campaignType) where.push(`campaign.advertising_channel_type = '${filters.campaignType}'`);
        if (filters.campaignStatus) {
          switch (filters.campaignStatus) {
            case 'ENABLED':
              where.push("campaign.status = 'ENABLED'");
              break;
            case 'PAUSED':
              where.push("campaign.status = 'PAUSED'");
              break;
            case 'ENDED':
              where.push("campaign.status = 'ENDED'");
              break;
            case 'DRAFT':
              where.push("campaign.status = 'DRAFT'");
              break;
            default:
              where.push(`campaign.status = '${filters.campaignStatus}'`);
          }
        }
        if (filters.startDate && filters.endDate) {
          // Ensure dates are in the account's timezone
          const startDate = formatInTimeZone(new Date(filters.startDate), timeZone, 'yyyy-MM-dd');
          const endDate = formatInTimeZone(new Date(filters.endDate), timeZone, 'yyyy-MM-dd');
          where.push(`segments.date BETWEEN '${startDate}' AND '${endDate}'`);
        } else {
          where.push(`segments.date DURING LAST_30_DAYS`);
        }

        const query = `
          SELECT
            segments.date,
            metrics.impressions,
            metrics.search_impression_share,
            metrics.clicks,
            metrics.ctr,
            metrics.average_cpc,
            metrics.cost_micros,
            metrics.conversions,
            metrics.cost_per_conversion,
            metrics.conversions_from_interactions_rate,
            metrics.conversions_value
          FROM campaign
          WHERE ${where.join(' AND ')}
          ORDER BY segments.date ASC
        `;

        return { response: await customer.query(query), currency, timeZone };
      })
    );

    // Combine and group by date
    const byDate: Record<string, any[]> = {};
    results.forEach(({ response }) => {
      response.forEach((row: any) => {
        const date = row.segments.date;
        if (!byDate[date]) byDate[date] = [];
        byDate[date].push(row);
      });
    });
    // If filtering for ENABLED, filter out campaigns with end_date < today per day
    if (filters.campaignStatus === 'ENABLED') {
      const today = new Date();
      for (const date in byDate) {
        byDate[date] = byDate[date].filter(row => {
          if (!row.campaign) return false;
          const endDate = row.campaign.end_date;
          if (!endDate) return true;
          const end = new Date(endDate + 'T23:59:59Z');
          return end >= today;
        });
      }
    }

    // Generate all dates in the range
    let allDates: string[] = [];
    if (filters.startDate && filters.endDate) {
      allDates = eachDayOfInterval({
        start: new Date(filters.startDate),
        end: new Date(filters.endDate),
      }).map((d) => format(d, 'yyyy-MM-dd'));
    } else if (Object.keys(byDate).length) {
      allDates = Object.keys(byDate).sort();
    }

    // Aggregate per day
    const timeSeries = allDates.map((date) => {
      const metricsArr = byDate[date] || [];
      let totals = {
        impressions: 0,
        clicks: 0,
        cost_micros: 0,
        conversions: 0,
        conversions_value: 0,
        search_impression_share: 0,
        ctr: 0,
        average_cpc: 0,
        cost_per_conversion: 0,
        conversions_from_interactions_rate: 0,
        count: 0,
      };

      metricsArr.forEach((m: any) => {
        totals.impressions += Number(m.metrics.impressions) || 0;
        totals.clicks += Number(m.metrics.clicks) || 0;
        totals.cost_micros += Number(m.metrics.cost_micros) || 0;
        totals.conversions += Number(m.metrics.conversions) || 0;
        totals.conversions_value += Number(m.metrics.conversions_value) || 0;
        totals.search_impression_share += Number(m.metrics.search_impression_share) || 0;
        totals.ctr += Number(m.metrics.ctr) || 0;
        totals.average_cpc += Number(m.metrics.average_cpc) || 0;
        totals.cost_per_conversion += Number(m.metrics.cost_per_conversion) || 0;
        totals.conversions_from_interactions_rate += Number(m.metrics.conversions_from_interactions_rate) || 0;
        totals.count++;
      });

      return {
        date,
        impressions: totals.impressions,
        clicks: totals.clicks,
        cpc: totals.clicks ? totals.cost_micros / totals.clicks / 1000000 : 0,
        cost: totals.cost_micros / 1000000,
        conversions: totals.conversions,
        cpa: totals.conversions ? totals.cost_micros / totals.conversions / 1000000 : 0,
        conversionRate: totals.clicks ? (totals.conversions / totals.clicks) * 100 : 0,
        conversionValue: totals.conversions_value,
        roas: totals.cost_micros ? totals.conversions_value / (totals.cost_micros / 1000000) : 0,
      };
    });

    // Use the currency and timezone from the first account
    const { currency, timeZone } = results[0];

    return {
      timeSeries,
      currency,
      timeZone,
    };
  } catch (error) {
    console.error('Error fetching Google Ads time series:', error);
    throw error;
  }
}

/**
 * Fetch all unique campaign types for the given Google Ads account(s).
 * Returns the raw types as Google Ads returns them (e.g., 'SEARCH', 'DISPLAY', etc.).
 */
export async function getGoogleAdsCampaignTypes(customerIds: string[]): Promise<string[]> {
  if (!customerIds.length) return [];
  const allTypes = new Set<string>();
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
    28: 'DEMAND_GEN', // Demand Gen (new)
  };
  await Promise.all(
    customerIds.map(async (customerId) => {
      const customer = client.Customer({
        customer_id: customerId,
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
        login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!,
      });
      const query = `
        SELECT campaign.advertising_channel_type
        FROM campaign
        WHERE campaign.status != 'REMOVED'
      `;
      try {
        const response = await customer.query(query);
        response.forEach((row: any) => {
          const typeNum = row.campaign?.advertising_channel_type;
          if (typeNum !== undefined && typeNum !== null) {
            if (typeMap[typeNum]) {
              allTypes.add(typeMap[typeNum]);
            } else {
              console.warn('Unknown campaign type code:', typeNum);
              allTypes.add(String(typeNum)); // fallback: show raw value
            }
          }
        });
      } catch (err) {
        console.error('Error fetching campaign types for account', customerId, JSON.stringify(err, null, 2));
      }
    })
  );
  return Array.from(allTypes);
} 