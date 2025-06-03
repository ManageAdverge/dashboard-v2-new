import React from 'react';
import { useRouter } from 'next/router';
import { styled } from '@mui/material/styles';
import { Box, Typography, IconButton } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { UserMenu } from './UserMenu';
import { FilterBar, DateRange } from './FilterBar';
import { useAccount } from '../context/AccountContext';
import { useSession } from 'next-auth/react';

const ClientNameContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(3, 2, 1),
}));

const HeaderContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(2),
}));

const HeaderContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
}));

const TitleSection = styled(Box)({
  display: 'flex',
  alignItems: 'center',
});

const FiltersSection = styled(Box)(({ theme }) => ({
  flex: 1,
  margin: `0 ${theme.spacing(4)}`,
}));

const ActionSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

interface PageHeaderProps {
  title: string;
  campaign?: string;
  setCampaign?: (campaign: string) => void;
  campaignType?: string;
  setCampaignType?: (type: string) => void;
  campaignStatus?: string;
  setCampaignStatus?: (status: string) => void;
  dateRange?: DateRange | undefined;
  setDateRange?: (range: DateRange) => void;
  hideFilters?: boolean;
  campaigns?: any[];
  types?: string[];
  statuses?: string[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  campaign = '',
  setCampaign = () => {},
  campaignType = '',
  setCampaignType = () => {},
  campaignStatus = '',
  setCampaignStatus = () => {},
  dateRange = undefined,
  setDateRange = () => {},
  hideFilters = false,
  campaigns = [],
  types = [],
  statuses = [],
}) => {
  const router = useRouter();
  const { clientName } = useAccount();
  const { data: session } = useSession();

  return (
    <>
      {clientName && (
        <ClientNameContainer>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 700,
              color: 'text.primary',
              marginBottom: 1
            }}
          >
            Dashboard - {clientName}
          </Typography>
        </ClientNameContainer>
      )}
      <HeaderContainer>
        <HeaderContent>
          <TitleSection>
            <Typography variant="h4" color="primary">
              {title}
            </Typography>
          </TitleSection>
          {!hideFilters && (
            <FiltersSection>
              <FilterBar
                campaign={campaign}
                setCampaign={setCampaign}
                campaignType={campaignType}
                setCampaignType={setCampaignType}
                campaignStatus={campaignStatus}
                setCampaignStatus={setCampaignStatus}
                dateRange={dateRange}
                setDateRange={setDateRange}
                campaigns={campaigns}
                types={types}
                statuses={statuses}
              />
            </FiltersSection>
          )}
          <ActionSection>
            {session?.user?.role === 'ADMIN' && (
            <IconButton
              onClick={() => router.push('/settings')}
              aria-label="settings"
              color="primary"
            >
              <SettingsIcon />
            </IconButton>
            )}
            <UserMenu />
          </ActionSection>
        </HeaderContent>
      </HeaderContainer>
    </>
  );
}; 