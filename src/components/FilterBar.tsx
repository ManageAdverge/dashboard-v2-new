import React, { useEffect, useState } from 'react';
import { Box, FormControl, Select, MenuItem, styled, Button, Menu, Checkbox, ListItemText, Popover } from '@mui/material';
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

// Add DateRange type and export it
export interface DateRange {
  start: Date;
  end: Date;
}

const FilterContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  minWidth: 160,
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  '& .MuiOutlinedInput-root': {
    height: 40,
  },
}));

const DateRangeButton = styled(Button)(({ theme }) => ({
  height: 40,
  minWidth: 200,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  textTransform: 'none',
  padding: '0 16px',
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    backgroundColor: theme.palette.background.paper,
  },
}));

interface DateRangePreset {
  label: string;
  getValue: () => { start: Date; end: Date };
}

// Helper to get the 'Last 30 days' preset in a specific timezone
export function getLast30DaysPresetValue(timeZone?: string) {
  // Default to browser timezone if not provided
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  // Calculate 'yesterday' in the target timezone
  const yesterday = subDays(now, 1);
  const start = startOfDay(subDays(yesterday, 29));
  const end = endOfDay(yesterday);
  // Use toZonedTime for robust conversion
  const startTz = toZonedTime(start, tz);
  const endTz = toZonedTime(end, tz);
  return { start: startTz, end: endTz };
}

export const dateRangePresets: DateRangePreset[] = [
  {
    label: 'Today',
    getValue: () => ({
      start: startOfDay(new Date()),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: 'Yesterday',
    getValue: () => ({
      start: startOfDay(subDays(new Date(), 1)),
      end: endOfDay(subDays(new Date(), 1)),
    }),
  },
  {
    label: 'Last 7 days',
    getValue: () => ({
      start: startOfDay(subDays(new Date(), 7)),
      end: endOfDay(subDays(new Date(), 1)),
    }),
  },
  {
    label: 'Last 14 days',
    getValue: () => ({
      start: startOfDay(subDays(new Date(), 14)),
      end: endOfDay(subDays(new Date(), 1)),
    }),
  },
  {
    label: 'Last 30 days',
    getValue: () => getLast30DaysPresetValue(),
  },
  {
    label: 'Last month',
    getValue: () => {
      const now = new Date();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return {
        start: startOfDay(startOfMonth(prevMonth)),
        end: endOfDay(endOfMonth(prevMonth)),
      };
    },
  },
  {
    label: 'This month',
    getValue: () => {
      const now = new Date();
      return {
        start: startOfDay(startOfMonth(now)),
        end: endOfDay(now),
      };
    },
  },
];

export const CAMPAIGN_TYPE_ENUMS = [
  'DEMAND_GEN',
  'DISPLAY',
  'HOTEL',
  'LOCAL',
  'LOCAL_SERVICES',
  'MULTI_CHANNEL',
  'PERFORMANCE_MAX',
  'SEARCH',
  'SHOPPING',
  'SMART',
  'TRAVEL',
  'UNKNOWN',
  'VIDEO',
];

interface FilterBarProps {
  campaign: string;
  setCampaign: (v: string) => void;
  campaignType: string;
  setCampaignType: (v: string) => void;
  campaignStatus: string;
  setCampaignStatus: (v: string) => void;
  dateRange?: DateRange;
  setDateRange: (v: DateRange) => void;
  campaigns: any[];
  types: string[];
  statuses: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  campaign,
  setCampaign,
  campaignType,
  setCampaignType,
  campaignStatus,
  setCampaignStatus,
  dateRange,
  setDateRange,
  campaigns,
  types,
  statuses,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDateRangeClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleDateRangeClose = () => {
    setAnchorEl(null);
  };

  const handleDateRangeSelect = (preset: typeof dateRangePresets[0]) => {
    setDateRange(preset.getValue());
    handleDateRangeClose();
  };

  const formatDateRange = (range: { start: Date; end: Date }) => {
    return `${format(range.start, 'MMM d, yyyy')} - ${format(range.end, 'MMM d, yyyy')}`;
  };

  return (
    <FilterContainer>
      <StyledFormControl>
        <Select
          value={campaign}
          onChange={(e) => setCampaign(e.target.value as string)}
          displayEmpty
        >
          <MenuItem value="">All Campaigns</MenuItem>
          {campaigns.map((c) => (
            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
          ))}
        </Select>
      </StyledFormControl>

      <StyledFormControl>
        <Select
          value={campaignType}
          onChange={(e) => setCampaignType(e.target.value as string)}
          displayEmpty
        >
          <MenuItem value="">All campaign types</MenuItem>
          {CAMPAIGN_TYPE_ENUMS.map((type) => (
            <MenuItem key={type} value={type}>
              {type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
            </MenuItem>
          ))}
        </Select>
      </StyledFormControl>

      <StyledFormControl>
        <Select
          value={campaignStatus}
          onChange={(e) => setCampaignStatus(e.target.value as string)}
          displayEmpty
        >
          <MenuItem value="">Campaign status</MenuItem>
          {statuses.map((status) => (
            <MenuItem key={status} value={status}>{status}</MenuItem>
          ))}
        </Select>
      </StyledFormControl>

      <DateRangeButton onClick={handleDateRangeClick}>
        {dateRange ? formatDateRange(dateRange) : ''}
      </DateRangeButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleDateRangeClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        {dateRangePresets.map((preset) => (
          <MenuItem
            key={preset.label}
            onClick={() => handleDateRangeSelect(preset)}
          >
            {preset.label}
          </MenuItem>
        ))}
      </Menu>
    </FilterContainer>
  );
}; 