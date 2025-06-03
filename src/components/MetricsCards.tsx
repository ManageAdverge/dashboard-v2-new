import React from 'react';
import { Grid, Card, CardContent, Typography, Box, styled, Paper } from '@mui/material';
import { AggregatedMetrics } from '../types/analytics';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  backgroundColor: theme.palette.background.paper,
}));

const MetricValue = styled(Typography)({
  fontSize: '1.5rem',
  fontWeight: 'bold',
});

const SectionTitle = styled(Typography)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  padding: theme.spacing(1, 2),
  borderRadius: theme.spacing(1, 1, 0, 0),
}));

const SectionContainer = styled(Paper)(({ theme }) => ({
  overflow: 'hidden',
  height: '100%',
}));

interface MetricsCardsProps {
  metrics: AggregatedMetrics | null;
}

const formatNumber = (value: number, type: 'currency' | 'percentage' | 'decimal' = 'decimal', currency: string = '$') => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 2 }).format(Number(value));
    case 'percentage':
      return `${Number(value).toFixed(2)}%`;
    default:
      return Number(value).toLocaleString();
  }
};

interface MetricSection {
  title: string;
  metrics: Array<{
    label: string;
    value: number;
    format?: 'currency' | 'percentage' | 'decimal';
  }>;
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const currency = metrics?.currency || 'USD';
  const sections: MetricSection[] = [
    {
      title: 'Before the click',
      metrics: [
        { label: 'Impressions', value: metrics?.impressions || 0 },
        { label: 'SIS', value: metrics?.sis || 0, format: 'percentage' },
      ],
    },
    {
      title: 'Click takes place',
      metrics: [
        { label: 'Clicks', value: metrics?.clicks || 0 },
        { label: 'CTR', value: metrics?.ctr || 0, format: 'percentage' },
        { label: 'CPC', value: metrics?.cpc || 0, format: 'currency' },
        { label: 'Cost', value: metrics?.cost || 0, format: 'currency' },
      ],
    },
    {
      title: 'After the click',
      metrics: [
        { label: 'Conversions', value: metrics?.conversions || 0 },
        { label: 'CPA', value: metrics?.cpa || 0, format: 'currency' },
        { label: 'Conv. Rate', value: metrics?.conversionRate || 0, format: 'percentage' },
        { label: 'Conv. Value', value: metrics?.conversionValue || 0, format: 'currency' },
        { label: 'ROAS', value: metrics?.roas || 0, format: 'percentage' },
      ],
    },
  ];

  return (
    <Grid container spacing={3}>
      {sections.map((section) => (
        <Grid item xs={12} md={section.title === 'Click takes place' ? 5 : 3.5} key={section.title}>
          <SectionContainer>
            <SectionTitle variant="h6">
              {section.title}
            </SectionTitle>
            <Box p={2}>
              <Grid container spacing={2}>
                {section.metrics.map((metric) => (
                  <Grid item xs={section.metrics.length <= 2 ? 12 : 6} key={metric.label}>
                    <StyledCard>
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary">
                          {metric.label}
                        </Typography>
                        <Box mt={1}>
                          <MetricValue>
                            {formatNumber(metric.value, metric.format, currency)}
                          </MetricValue>
                        </Box>
                      </CardContent>
                    </StyledCard>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </SectionContainer>
        </Grid>
      ))}
    </Grid>
  );
} 