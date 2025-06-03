export interface Campaign {
  id: string;
  name: string;
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
  type: string;
  status: string;
  endDate: string;
}

export interface AggregatedMetrics {
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
  currency: string;
  timeZone: string;
}

export interface DashboardData {
  aggregatedMetrics: AggregatedMetrics;
  campaigns: Campaign[];
  currency: string;
  timeZone: string;
} 