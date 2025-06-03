import React, { useEffect, useState } from 'react';
import { Grid, Paper, styled, Typography } from '@mui/material';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { TooltipItem } from 'chart.js';
import { useAccount } from '../context/AccountContext';
import { dateRangePresets, CAMPAIGN_TYPE_ENUMS } from '../components/FilterBar';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ChartContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
}));

const CURRENCY_METRICS = [
  'Costs',
  'Average CPC',
  'Cost / Conversions (CPA)',
  'Conversion Value',
  'Conversion Value / Costs (ROAS)',
];

const PERCENT_METRICS = [
  'Conversion Rates',
];

function getCurrencySymbol(code: string) {
  switch (code) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    case 'AUD': return 'A$';
    case 'CAD': return 'C$';
    case 'CHF': return 'CHF';
    case 'CNY': return '¥';
    case 'SEK': return 'kr';
    case 'NZD': return 'NZ$';
    default: return code;
  }
}

function getChartOptions(metricTitle: string, currency: string) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        callbacks: {
          title: (items: TooltipItem<'line'>[]) => items[0].label,
          label: (item: TooltipItem<'line'>) => {
            const value = item.parsed.y;
            if (CURRENCY_METRICS.includes(metricTitle)) {
              const formatted = value ? value.toFixed(2) : '0.00';
              return `${item.dataset.label}: ${getCurrencySymbol(currency)}${formatted}`;
            }
            if (PERCENT_METRICS.includes(metricTitle)) {
              const formatted = value ? value.toFixed(2) : '0.00';
              return `${item.dataset.label}: ${formatted}%`;
            }
            if (typeof value === 'number' && !Number.isInteger(value)) {
              return `${item.dataset.label}: ${value.toFixed(2)}`;
            }
            return `${item.dataset.label}: ${value}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
    elements: {
      line: {
        tension: 0.4,
      },
      point: {
        radius: 0,
      },
    },
  } as const;
}

interface MetricData {
  title: string;
  current: number[];
  previous: number[];
  labels: string[];
  previousLabels: string[];
}

interface TrendsData {
  metrics: MetricData[];
  currency: string;
  timeZone: string;
}

const createChartData = (metric: MetricData) => {
  return {
    labels: metric.labels,
    datasets: [
      {
        label: 'Current',
        data: metric.current,
        borderColor: 'rgb(75, 102, 173)',
        backgroundColor: 'rgba(75, 102, 173, 0.1)',
        fill: true,
      },
      {
        label: 'Previous Year',
        data: metric.previous,
        borderColor: 'rgb(255, 193, 7)',
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        fill: true,
      },
    ],
  };
};

export default function Trends() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { selectedGoogleAdsAccountId, loading: accountLoading } = useAccount();
  // Debug log for initial load issue
  console.log({ accountLoading, selectedGoogleAdsAccountId, session, status });
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState('');
  const [campaignType, setCampaignType] = useState<string>('');
  const [campaignStatus, setCampaignStatus] = useState('ENABLED');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => {
    const last30DaysPreset = dateRangePresets.find(preset => preset.label === 'Last 30 days');
    return last30DaysPreset ? last30DaysPreset.getValue() : {
      start: startOfDay(subDays(new Date(), 30)),
      end: endOfDay(subDays(new Date(), 1)),
    };
  });
  const [timeZone, setTimeZone] = useState<string>('UTC');
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (!accountLoading && selectedGoogleAdsAccountId.length) {
      const fetchTrendsData = async () => {
        try {
          setLoading(true);
          setError(null);
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
          const res = await fetch(`/api/analytics/trends?${params.toString()}`);
          if (!res.ok) throw await res.json();
          const data = await res.json();
          setTrendsData(data);
          setTimeZone(data.timeZone || 'UTC');
        } catch (err: any) {
          setError(err?.error || err?.message || 'Failed to fetch trends data');
        } finally {
          setLoading(false);
        }
      };
      fetchTrendsData();
    }
  }, [accountLoading, selectedGoogleAdsAccountId, campaign, campaignType, campaignStatus, dateRange, timeZone]);

  // Fetch campaigns for filter options
  useEffect(() => {
    if (accountLoading || !selectedGoogleAdsAccountId.length) return;
    const fetchCampaigns = async () => {
      try {
        const params = new URLSearchParams();
        if (campaign) params.append('campaignId', campaign);
        if (campaignType) params.append('campaignType', campaignType);
        if (campaignStatus) params.append('campaignStatus', campaignStatus);
        if (dateRange) {
          params.append('startDate', formatInTimeZone(dateRange.start, timeZone, 'yyyy-MM-dd'));
          params.append('endDate', formatInTimeZone(dateRange.end, timeZone, 'yyyy-MM-dd'));
        }
        if (selectedGoogleAdsAccountId.length) {
          params.append('customerIds', selectedGoogleAdsAccountId.join(','));
        }
        const res = await fetch(`/api/campaigns?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        setCampaigns(Array.isArray(data) ? data : []);
      } catch (e) {
        setCampaigns([]);
      }
    };
    fetchCampaigns();
  }, [accountLoading, campaign, campaignType, campaignStatus, dateRange, selectedGoogleAdsAccountId, timeZone]);

  // Compute filter options from campaigns
  const campaignOptions = campaigns;
  const typeOptions = Array.from(new Set(campaigns.map((c) => c.type)))
    .filter((v): v is string => typeof v === 'string');
  const statusOptions = Array.from(new Set(campaigns.map((c) => c.status))).filter((v): v is string => typeof v === 'string');

  useEffect(() => {
    if (!accountLoading && !selectedGoogleAdsAccountId.length) {
      setLoading(false);
    }
  }, [accountLoading, selectedGoogleAdsAccountId]);

  if (accountLoading || loading) {
    return (
      <Layout>
        <PageHeader 
          title="Trends"
          campaign={campaign}
          setCampaign={setCampaign}
          campaignType={campaignType}
          setCampaignType={setCampaignType}
          campaignStatus={campaignStatus}
          setCampaignStatus={setCampaignStatus}
          dateRange={dateRange}
          setDateRange={setDateRange}
          campaigns={campaignOptions}
          types={CAMPAIGN_TYPE_ENUMS}
          statuses={statusOptions}
        />
        <Grid container spacing={3}>
          {Array.from({ length: 9 }).map((_, index) => (
            <Grid item xs={12} md={6} lg={4} key={index} style={{ height: '300px' }}>
              <ChartContainer>
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Loading...
                </div>
              </ChartContainer>
            </Grid>
          ))}
        </Grid>
      </Layout>
    );
  }

  if (!selectedGoogleAdsAccountId.length) {
    return (
      <Layout>
        <PageHeader 
          title="Trends"
          campaign={campaign}
          setCampaign={setCampaign}
          campaignType={campaignType}
          setCampaignType={setCampaignType}
          campaignStatus={campaignStatus}
          setCampaignStatus={setCampaignStatus}
          dateRange={dateRange}
          setDateRange={setDateRange}
          campaigns={campaignOptions}
          types={CAMPAIGN_TYPE_ENUMS}
          statuses={statusOptions}
        />
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <ChartContainer>
              <Typography color="error" align="center">
                Please select at least one Google Ads account in Settings.
              </Typography>
            </ChartContainer>
          </Grid>
        </Grid>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <PageHeader 
          title="Trends"
          campaign={campaign}
          setCampaign={setCampaign}
          campaignType={campaignType}
          setCampaignType={setCampaignType}
          campaignStatus={campaignStatus}
          setCampaignStatus={setCampaignStatus}
          dateRange={dateRange}
          setDateRange={setDateRange}
          campaigns={campaignOptions}
          types={CAMPAIGN_TYPE_ENUMS}
          statuses={statusOptions}
        />
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <ChartContainer>
              <Typography color="error" align="center">
                {error}
              </Typography>
            </ChartContainer>
          </Grid>
        </Grid>
      </Layout>
    );
  }

  if (!trendsData) {
    return null;
  }

  return (
    <Layout>
      <PageHeader 
        title="Trends"
        campaign={campaign}
        setCampaign={setCampaign}
        campaignType={campaignType}
        setCampaignType={setCampaignType}
        campaignStatus={campaignStatus}
        setCampaignStatus={setCampaignStatus}
        dateRange={dateRange}
        setDateRange={setDateRange}
        campaigns={campaignOptions}
        types={CAMPAIGN_TYPE_ENUMS}
        statuses={statusOptions}
      />
      <Grid container spacing={3}>
        {trendsData.metrics.map((metric, index) => (
          <Grid item xs={12} md={6} lg={4} key={index} style={{ height: '300px' }}>
            <ChartContainer>
              <Typography variant="h6" gutterBottom>
                {metric.title}
              </Typography>
              <div style={{ height: 'calc(100% - 40px)' }}>
                <Line
                  data={createChartData(metric)}
                  options={getChartOptions(metric.title, trendsData.currency)}
                />
              </div>
            </ChartContainer>
          </Grid>
        ))}
      </Grid>
    </Layout>
  );
} 