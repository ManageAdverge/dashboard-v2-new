import React, { useState } from 'react';
import {
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  styled,
} from '@mui/material';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: 32,
  height: 32,
  fontSize: '0.9rem',
  backgroundColor: theme.palette.primary.main,
  cursor: 'pointer',
}));

interface UserSettingsFormData {
  name: string;
  email: string;
  currentPassword: string;
  newPassword: string;
}

export function UserMenu() {
  const { data: session } = useSession();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openSettings, setOpenSettings] = useState(false);
  const [formData, setFormData] = useState<UserSettingsFormData>({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    currentPassword: '',
    newPassword: '',
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOpenSettings = () => {
    handleClose();
    setOpenSettings(true);
  };

  const handleCloseSettings = () => {
    setOpenSettings(false);
    setFormData({
      name: session?.user?.name || '',
      email: session?.user?.email || '',
      currentPassword: '',
      newPassword: '',
    });
  };

  const handleSaveSettings = async () => {
    try {
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update user settings');
      }

      // Refresh the session to get updated user data
      window.location.reload();
    } catch (error) {
      console.error('Error updating user settings:', error);
    }
  };

  if (!session?.user) return null;

  return (
    <>
      <StyledAvatar onClick={handleClick}>
        {getInitials(session.user.name || 'User')}
      </StyledAvatar>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleOpenSettings}>Profile Settings</MenuItem>
        <MenuItem onClick={() => signOut()}>Sign Out</MenuItem>
      </Menu>

      <Dialog open={openSettings} onClose={handleCloseSettings} maxWidth="sm" fullWidth>
        <DialogTitle>Profile Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            />
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              helperText="Leave blank if you don't want to change your password"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSettings}>Cancel</Button>
          <Button onClick={handleSaveSettings} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 