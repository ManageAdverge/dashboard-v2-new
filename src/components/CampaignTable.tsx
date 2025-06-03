import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  styled,
} from '@mui/material';
import { Campaign } from '../types/analytics';

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  marginTop: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 'bold',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
}));

interface CampaignTableProps {
  campaigns: Campaign[];
  currency?: string;
}

const formatValue = (value: number, type: 'currency' | 'percentage' | 'decimal' = 'decimal', currency: string = 'USD') => {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(value));
    case 'percentage':
      return `${value.toFixed(2)}%`;
    default:
      return value.toLocaleString();
  }
};

export function CampaignTable({
  campaigns = [],
  currency = 'USD',
}: CampaignTableProps) {
  const columns = [
    { field: 'name', header: 'Campaign', format: 'text' },
    { field: 'impressions', header: 'Impressions', format: 'decimal' },
    { field: 'clicks', header: 'Clicks', format: 'decimal' },
    { field: 'ctr', header: 'CTR', format: 'percentage' },
    { field: 'cpc', header: 'CPC', format: 'currency' },
    { field: 'cost', header: 'Cost', format: 'currency' },
    { field: 'conversions', header: 'Conversions', format: 'decimal' },
    { field: 'conversionValue', header: 'Conv. Value', format: 'currency' },
    { field: 'cpa', header: 'CPA', format: 'currency' },
    { field: 'roas', header: 'ROAS', format: 'decimal' },
    { field: 'conversionRate', header: 'Conv%', format: 'percentage' },
    { field: 'sis', header: 'SIS', format: 'percentage' },
  ];

  // Calculate totals
  const totals = campaigns.reduce(
    (acc, c) => {
      acc.impressions += c.impressions;
      acc.clicks += c.clicks;
      acc.cost += c.cost;
      acc.conversions += c.conversions;
      acc.conversionValue += c.conversionValue;
      acc.sis += c.sis;
      return acc;
    },
    {
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      conversionValue: 0,
      sis: 0,
    }
  );
  const count = campaigns.length;
  // Calculated fields (same as scorecards)
  const totalCtr = totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0;
  const totalCpc = totals.clicks ? totals.cost / totals.clicks : 0;
  const totalCpa = totals.conversions ? totals.cost / totals.conversions : 0;
  const totalRoas = totals.cost ? totals.conversionValue / totals.cost : 0;
  const totalConvRate = totals.clicks ? (totals.conversions / totals.clicks) * 100 : 0;
  const totalSis = count ? totals.sis / count : 0;

  const totalsRow: Record<string, any> = {
    name: 'Total',
    impressions: totals.impressions,
    clicks: totals.clicks,
    ctr: totalCtr,
    cpc: totalCpc,
    cost: totals.cost,
    conversions: totals.conversions,
    conversionValue: totals.conversionValue,
    cpa: totalCpa,
    roas: totalRoas,
    conversionRate: totalConvRate,
    sis: totalSis,
  };

  return (
    <Paper>
      <StyledTableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <StyledTableCell key={column.field}>{column.header}</StyledTableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                {columns.map((column) => (
                  <TableCell key={`${campaign.id}-${column.field}`}>
                    {column.format === 'text'
                      ? campaign[column.field as keyof Campaign]
                      : formatValue(
                          campaign[column.field as keyof Campaign] as number,
                          column.format as 'currency' | 'percentage' | 'decimal',
                          currency
                        )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {/* Totals row */}
            <TableRow style={{ background: '#f5f5f5', fontWeight: 'bold' }}>
              {columns.map((column) => (
                <TableCell key={`totals-${column.field}`} style={{ fontWeight: 'bold' }}>
                  {column.format === 'text'
                    ? totalsRow[column.field]
                    : formatValue(
                        totalsRow[column.field] as number,
                        column.format as 'currency' | 'percentage' | 'decimal',
                        currency
                      )}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </StyledTableContainer>
    </Paper>
  );
} 