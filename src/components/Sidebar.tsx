import React from 'react';
import { Box, List, ListItem, ListItemIcon, ListItemText, styled, Divider, ListItemButton } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CampaignIcon from '@mui/icons-material/Campaign';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LogoutIcon from '@mui/icons-material/Logout';
import TargetIcon from '@mui/icons-material/TrackChanges';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { signOut } from 'next-auth/react';

const SidebarContainer = styled(Box)(({ theme }) => ({
  width: 240,
  backgroundColor: theme.palette.primary.main,
  height: '100vh',
  color: 'white',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
}));

const LogoContainer = styled(Box)({
  marginBottom: '2rem',
  textAlign: 'center',
  position: 'relative',
  height: '40px',
  width: '160px',
  margin: '0 auto',
});

const StyledListItemButton = styled(ListItemButton)<{ active?: boolean }>(({ theme, active }) => ({
  borderRadius: theme.spacing(1),
  marginBottom: theme.spacing(1),
  backgroundColor: active ? theme.palette.secondary.main : 'transparent',
  '&:hover': {
    backgroundColor: active ? theme.palette.secondary.main : 'rgba(255, 255, 255, 0.1)',
  },
}));

const navigationItems = [
  { text: 'Overview', icon: <DashboardIcon />, path: '/' },
  { text: 'Trends', icon: <CampaignIcon />, path: '/trends' },
  { text: 'Budget', icon: <AccountBalanceWalletIcon />, path: '/budget' },
  { text: 'Targets', icon: <TargetIcon />, path: '/targets' },
];

const StyledDivider = styled(Divider)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.12)',
  margin: theme.spacing(2, 0),
}));

export const Sidebar = () => {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <SidebarContainer>
      <LogoContainer>
        <Image
          src="/logo.png"
          alt="Dashboard Logo"
          fill
          style={{ 
            objectFit: 'contain',
            filter: 'brightness(0) invert(1)'
          }}
          priority
        />
      </LogoContainer>
      <List sx={{ flexGrow: 1 }}>
        {navigationItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <StyledListItemButton
              active={router.pathname === item.path}
              onClick={() => router.push(item.path)}
            >
              <ListItemIcon sx={{ color: 'white' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </StyledListItemButton>
          </ListItem>
        ))}
      </List>
      <StyledDivider />
      <List>
        <ListItem disablePadding>
          <StyledListItemButton onClick={handleLogout}>
            <ListItemIcon sx={{ color: 'white' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </StyledListItemButton>
        </ListItem>
      </List>
    </SidebarContainer>
  );
}; 