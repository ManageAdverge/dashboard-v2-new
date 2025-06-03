import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  styled,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { useAccount } from '../context/AccountContext';
import { useSession } from 'next-auth/react';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useRouter } from 'next/router';

const SettingsBlock = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  '& + &': {
    marginTop: theme.spacing(4),
  },
}));

const SettingsTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const SettingsField = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

const formatNumber = (value: string) => {
  // Remove any non-digit characters except decimal point
  const cleanValue = value.replace(/[^\d.]/g, '');
  
  // Split into integer and decimal parts
  const [integer, decimal] = cleanValue.split('.');
  
  // Add thousands separator to integer part
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Return formatted number with decimal if it exists
  return decimal !== undefined ? `${formattedInteger}.${decimal}` : formattedInteger;
};

const parseNumber = (value: string) => {
  // Remove commas and convert to number
  return value ? parseFloat(value.replace(/,/g, '')) : null;
};

export default function Settings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
  });
  const {
    clientName: contextClientName,
    setClientName: setClientNameContext,
  } = useAccount();
  const [clientName, setClientName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [googleAdsAccountIds, setGoogleAdsAccountIds] = useState<string[]>([]);
  const [googleAdsAccountIdsInput, setGoogleAdsAccountIdsInput] = useState('');
  const [microsoftAdsAccountIds, setMicrosoftAdsAccountIds] = useState<string[]>([]);
  const [microsoftAdsAccountIdsInput, setMicrosoftAdsAccountIdsInput] = useState('');

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [session]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      // Show 403 error for non-admins
      setError('403 Forbidden: You do not have access to this page.');
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setGoogleAdsAccountIds(data.googleAdsAccountIds || []);
          setGoogleAdsAccountIdsInput((data.googleAdsAccountIds || []).join(', '));
          setMicrosoftAdsAccountIds(data.microsoftAdsAccountIds || []);
          setMicrosoftAdsAccountIdsInput((data.microsoftAdsAccountIds || []).join(', '));
          setClientName(data.clientName || '');
        } else {
          setError('Failed to load settings');
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        setError('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchSettings();
    }
  }, [status]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        console.error('Failed to fetch users:', await response.text());
        return;
      }
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Only set error if user is admin
      if (session?.user?.role === 'ADMIN') {
        setError('Failed to load users');
      }
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'USER',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'USER',
    });
  };

  const handleSubmit = async () => {
    try {
      const url = editingUser
        ? `/api/users/${editingUser.id}`
        : '/api/invitations';
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser
        ? JSON.stringify(formData)
        : JSON.stringify({
            email: formData.email,
            role: formData.role,
          });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      if (!response.ok) throw new Error('Failed to save user');

      setSuccessMessage(
        editingUser ? 'User updated successfully' : 'Invitation sent successfully'
      );
      setShowSuccess(true);
      handleCloseDialog();
      fetchUsers();
    } catch (error) {
      setError('Failed to save user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete user');

      setSuccessMessage('User deleted successfully');
      setShowSuccess(true);
      fetchUsers();
    } catch (error) {
      setError('Failed to delete user');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      // Parse Google Ads input into array
      const parsedGoogleAdsIds = googleAdsAccountIdsInput
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);

      // Parse Microsoft Ads input into array (optional)
      const parsedMicrosoftAdsIds = microsoftAdsAccountIdsInput
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);

      // Validate Google Ads account IDs
      const invalidGoogleAdsIds = parsedGoogleAdsIds.filter(id => !/^[0-9]{10}$/.test(id));
      if (invalidGoogleAdsIds.length > 0) {
        setError(`Invalid Google Ads account IDs: ${invalidGoogleAdsIds.join(', ')}. Account IDs must be 10 digits.`);
        return;
      }
      if (parsedGoogleAdsIds.length === 0) {
        setError('Please enter at least one Google Ads account ID');
        return;
      }

      // Validate Microsoft Ads account IDs (if provided)
      const invalidMicrosoftAdsIds = parsedMicrosoftAdsIds.filter(id => !/^[0-9]{8}$/.test(id));
      if (invalidMicrosoftAdsIds.length > 0) {
        setError(`Invalid Microsoft Ads account IDs: ${invalidMicrosoftAdsIds.join(', ')}. Account IDs must be 8 digits.`);
        return;
      }

      // Prepare the data with proper type conversion
      const settingsData = {
        clientName,
        googleAdsAccountIds: parsedGoogleAdsIds,
        selectedGoogleAdsAccountId: parsedGoogleAdsIds, // Use all as selected
        microsoftAdsAccountIds: parsedMicrosoftAdsIds,
        selectedMicrosoftAdsAccountId: parsedMicrosoftAdsIds, // Use all as selected
      };

      console.log('Saving settings with data:', settingsData);

      // Save directly to the API
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsData),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const savedData = await response.json();
      console.log('Saved settings:', savedData);

      // Update local state with saved data
      setGoogleAdsAccountIds(savedData.googleAdsAccountIds || []);
      setGoogleAdsAccountIdsInput((savedData.googleAdsAccountIds || []).join(', '));
      setMicrosoftAdsAccountIds(savedData.microsoftAdsAccountIds || []);
      setMicrosoftAdsAccountIdsInput((savedData.microsoftAdsAccountIds || []).join(', '));
      setClientName(savedData.clientName || '');

      // Update context
      setClientNameContext(savedData.clientName || '');

      setSuccessMessage('Settings saved successfully');
      setShowSuccess(true);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <PageHeader title="Settings" hideFilters />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (!session) {
    return null;
  }

  if (session.user.role !== 'ADMIN') {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">403 Forbidden: You do not have access to this page.</Alert>
      </Box>
    );
  }

  return (
    <Layout>
      <PageHeader title="Settings" hideFilters />
      <Box sx={{ padding: 3 }}>
        <SettingsBlock>
          <SettingsTitle variant="h6">Account Settings</SettingsTitle>
          <SettingsField>
            <TextField
              fullWidth
              variant="outlined"
              label="Client Name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter your client name"
            />
          </SettingsField>
          <SettingsField>
            <TextField
              fullWidth
              variant="outlined"
              label="Google Ads Account IDs"
              value={googleAdsAccountIdsInput}
              onChange={(e) => setGoogleAdsAccountIdsInput(e.target.value)}
              placeholder="Enter Google Ads Account IDs (comma-separated)"
              helperText="Enter multiple account IDs separated by commas (e.g., 1234567890, 0987654321)"
              required
            />
          </SettingsField>
          <SettingsField>
            <TextField
              fullWidth
              variant="outlined"
              label="Microsoft Ads Account IDs (Optional)"
              value={microsoftAdsAccountIdsInput}
              onChange={(e) => setMicrosoftAdsAccountIdsInput(e.target.value)}
              placeholder="Enter Microsoft Ads Account IDs (comma-separated)"
              helperText="Enter multiple account IDs separated by commas (e.g., 12345678, 87654321)"
            />
          </SettingsField>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {successMessage && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {successMessage}
            </Alert>
          )}
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </SettingsBlock>

        {session?.user?.role === 'ADMIN' && (
          <SettingsBlock>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <SettingsTitle variant="h6">User Management</SettingsTitle>
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleOpenDialog()}
              >
                Add User
              </Button>
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={() => handleOpenDialog(user)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeleteUser(user.id)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SettingsBlock>
        )}
      </Box>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {editingUser && (
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                margin="normal"
              />
            )}
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              margin="normal"
              disabled={!!editingUser}
            />
            {editingUser && (
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                margin="normal"
                helperText={
                  editingUser
                    ? 'Leave blank to keep current password'
                    : 'Enter password for new user'
                }
              />
            )}
            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                label="Role"
              >
                <MenuItem value="USER">User</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowSuccess(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={3000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setError('')}
          severity="error"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Layout>
  );
} 