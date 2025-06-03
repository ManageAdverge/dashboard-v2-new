import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Layout } from '../components/Layout';
import { MetricsCards } from '../components/MetricsCards';
import { CampaignTable } from '../components/CampaignTable';
import { BudgetProgress } from '../components/BudgetProgress';
import { PageHeader } from '../components/PageHeader';
import { AggregatedMetrics, Campaign } from '../types/analytics';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { formatInTimeZone } from 'date-fns-tz';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { useAccount } from '../context/AccountContext';
import { CircularProgress, Box, Grid } from '@mui/material';
import { dateRangePresets, CAMPAIGN_TYPE_ENUMS, DateRange } from '../components/FilterBar';

function renderError(error: any) {
  if (!error) return null;
  if (typeof error === 'string') return error;
  try {
    return <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(error, null, 2)}</pre>;
  } catch {
    return String(error);
  }
}

export default function Overview() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { selectedGoogleAdsAccountId, loading: accountLoading } = useAccount();
  // Debug log for initial load issue
  console.log({ accountLoading, selectedGoogleAdsAccountId, session, status });
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isFirstLoad = useRef(true);
  const [budgetProgress, setBudgetProgress] = useState<{
    currentCosts: number;
    totalBudget: number;
    currency: string;
  } | null>(null);

  // Filter state
  const [campaign, setCampaign] = useState('');
  const [campaignType, setCampaignType] = useState<string>('');
  const [campaignStatus, setCampaignStatus] = useState('ENABLED');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [timeZone, setTimeZone] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('USD');

  // Track filter changes
  const prevFilters = useRef<{ campaign: string; campaignType: string; campaignStatus: string; dateRange: DateRange | undefined }>({ 
    campaign: '', 
    campaignType: '', 
    campaignStatus: '', 
    dateRange: undefined 
  });

  // Initialize date range when account is loaded
  useEffect(() => {
    if (!accountLoading && selectedGoogleAdsAccountId.length && !dateRange) {
      const last30DaysPreset = dateRangePresets.find(preset => preset.label === 'Last 30 days');
      setDateRange(last30DaysPreset ? last30DaysPreset.getValue() : {
        start: startOfDay(subDays(new Date(), 30)),
        end: endOfDay(subDays(new Date(), 1)),
      });
    }
  }, [accountLoading, selectedGoogleAdsAccountId, dateRange]);

  // Fetch functions
  const fetchMetrics = useCallback(async () => {
    if (!dateRange) return null;
    const params = new URLSearchParams();
    if (campaign) params.append('campaignId', campaign);
    if (campaignType) params.append('campaignType', campaignType);
    if (campaignStatus) params.append('campaignStatus', campaignStatus);
    if (dateRange) {
      const tz = timeZone || 'UTC';
      params.append('startDate', formatInTimeZone(dateRange.start, tz, 'yyyy-MM-dd'));
      params.append('endDate', formatInTimeZone(dateRange.end, tz, 'yyyy-MM-dd'));
    }
    if (selectedGoogleAdsAccountId.length) {
      params.append('customerIds', selectedGoogleAdsAccountId.join(','));
    }

    const metricsRes = await fetch(`/api/analytics/metrics?${params.toString()}`);
    if (!metricsRes.ok) {
      const contentType = metricsRes.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        throw await metricsRes.json();
      } else {
        throw await metricsRes.text();
      }
    }
    const contentType = metricsRes.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await metricsRes.json();
    } else {
      throw await metricsRes.text();
    }
  }, [campaign, campaignType, campaignStatus, dateRange, timeZone, selectedGoogleAdsAccountId]);

  const fetchCampaigns = useCallback(async () => {
    if (!dateRange) return null;
    const params = new URLSearchParams();
    if (campaign) params.append('campaignId', campaign);
    if (campaignType) params.append('campaignType', campaignType);
    if (campaignStatus) params.append('campaignStatus', campaignStatus);
    if (dateRange) {
      const tz = timeZone || 'UTC';
      params.append('startDate', formatInTimeZone(dateRange.start, tz, 'yyyy-MM-dd'));
      params.append('endDate', formatInTimeZone(dateRange.end, tz, 'yyyy-MM-dd'));
    }
    if (selectedGoogleAdsAccountId.length) {
      params.append('customerIds', selectedGoogleAdsAccountId.join(','));
    }

    const campaignsRes = await fetch(`/api/campaigns?${params.toString()}`);
    if (!campaignsRes.ok) throw await campaignsRes.json();
    return await campaignsRes.json();
  }, [campaign, campaignType, campaignStatus, dateRange, timeZone, selectedGoogleAdsAccountId]);

  const fetchBudgetProgress = useCallback(async () => {
    if (!timeZone) return null;
    try {
      const response = await fetch(`/api/budget/progress?timeZone=${encodeURIComponent(timeZone)}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error fetching budget progress:', error);
      return null;
    }
  }, [timeZone]);

  // Fetch all data
  const fetchAllData = useCallback(async (isBackground = false) => {
    if (!dateRange || !selectedGoogleAdsAccountId.length) return;
    if (isBackground) {
      setIsRefreshing(true);
    } else {
      setIsInitialLoading(true);
    }

    try {
      // Fetch all data in parallel to ensure consistency
      const [metricsData, campaignsData, budgetData] = await Promise.all([
        fetchMetrics(),
        fetchCampaigns(),
        timeZone ? fetchBudgetProgress() : Promise.resolve(null)
      ]);

      // Only update state if we got valid data
      if (metricsData) {
        setMetrics(metricsData);
        setTimeZone(metricsData.timeZone || 'UTC');
        setCurrency(metricsData.currency || 'USD');
      }
      if (campaignsData) {
        setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
      }
      if (budgetData) {
        setBudgetProgress(budgetData);
      }
      setError(null);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError(error?.error || error?.message || error);
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [dateRange, timeZone, fetchMetrics, fetchCampaigns, fetchBudgetProgress]);

  // On mount or when account changes, fetch data
  useEffect(() => {
    if (!accountLoading && selectedGoogleAdsAccountId.length && dateRange) {
      fetchAllData();
    }
  }, [fetchAllData, selectedGoogleAdsAccountId, accountLoading, dateRange]);

  // Fetch all data when filters change
  useEffect(() => {
    if (accountLoading || !selectedGoogleAdsAccountId.length || !dateRange) return;
    const filtersChanged =
      prevFilters.current.campaign !== campaign ||
      prevFilters.current.campaignType !== campaignType ||
      prevFilters.current.campaignStatus !== campaignStatus ||
      !prevFilters.current.dateRange ||
      prevFilters.current.dateRange.start.getTime() !== dateRange.start.getTime() ||
      prevFilters.current.dateRange.end.getTime() !== dateRange.end.getTime();
    if (isFirstLoad.current || filtersChanged) {
      isFirstLoad.current = false;
      prevFilters.current = { campaign, campaignType, campaignStatus, dateRange };
      fetchAllData(false);
    }
  }, [campaign, campaignType, campaignStatus, dateRange, selectedGoogleAdsAccountId, accountLoading, fetchAllData]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Auto-refresh (background)
  useEffect(() => {
    if (status === 'authenticated' && dateRange) {
      const interval = setInterval(() => {
        fetchAllData(true);
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [status, fetchAllData, dateRange]);

  // Compute filter options from campaigns
  const campaignOptions = campaigns;
  const statusOptions = Array.from(new Set(campaigns.map((c) => c.status))).filter((v): v is string => typeof v === 'string');
  const typeOptions = Array.from(new Set(campaigns.map((c) => c.type))).filter((v): v is string => typeof v === 'string');

  if (status === 'loading' || isInitialLoading || accountLoading) {
    return (
      <Layout>
        <PageHeader
          title="Campaign Overview"
          campaign={campaign}
          setCampaign={setCampaign}
          campaignType={campaignType}
          setCampaignType={setCampaignType}
          campaignStatus={campaignStatus}
          setCampaignStatus={setCampaignStatus}
          dateRange={dateRange ?? undefined}
          setDateRange={setDateRange}
          campaigns={campaignOptions}
          types={typeOptions}
          statuses={statusOptions}
        />
        <Box display="flex" justifyContent="center" alignItems="center" height={400}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (!accountLoading && !selectedGoogleAdsAccountId.length) {
    return (
      <Layout>
        <PageHeader
          title="Campaign Overview"
          campaign={campaign}
          setCampaign={setCampaign}
          campaignType={campaignType}
          setCampaignType={setCampaignType}
          campaignStatus={campaignStatus}
          setCampaignStatus={setCampaignStatus}
          dateRange={dateRange ?? undefined}
          setDateRange={setDateRange}
          campaigns={[]}
          types={[]}
          statuses={[]}
        />
        <Box display="flex" justifyContent="center" alignItems="center" height={400}>
          <span>Please select at least one Google Ads account in Settings.</span>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Campaign Overview"
        campaign={campaign}
        setCampaign={setCampaign}
        campaignType={campaignType}
        setCampaignType={setCampaignType}
        campaignStatus={campaignStatus}
        setCampaignStatus={setCampaignStatus}
        dateRange={dateRange ?? undefined}
        setDateRange={setDateRange}
        campaigns={campaignOptions}
        types={typeOptions}
        statuses={statusOptions}
      />
      {error && (
        <div style={{ color: 'red', padding: '20px' }}>{renderError(error)}</div>
      )}
      {isRefreshing && (
        <Box display="flex" justifyContent="center" alignItems="center" height={40}>
          <CircularProgress size={20} /> Refreshing...
        </Box>
      )}
      <MetricsCards metrics={metrics} />
      {budgetProgress && (
        <Box sx={{ mt: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <BudgetProgress
                currentCosts={budgetProgress.currentCosts}
                totalBudget={budgetProgress.totalBudget}
                currency={budgetProgress.currency}
              />
            </Grid>
          </Grid>
        </Box>
      )}
      <CampaignTable campaigns={campaigns} currency={currency} />
    </Layout>
  );
} 