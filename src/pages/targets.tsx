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
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { useSession } from 'next-auth/react';
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

export default function Targets() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [targetFocus, setTargetFocus] = useState<'conversion' | 'value'>('conversion');
  const [conversionTarget, setConversionTarget] = useState('');
  const [cpaTarget, setCpaTarget] = useState('');
  const [conversionValueTarget, setConversionValueTarget] = useState('');
  const [roasTarget, setRoasTarget] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setTargetFocus(data.targetFocus || 'conversion');
          setConversionTarget(data.conversionTarget ? formatNumber(data.conversionTarget.toString()) : '');
          setCpaTarget(data.cpaTarget ? formatNumber(data.cpaTarget.toString()) : '');
          setConversionValueTarget(data.conversionValueTarget ? formatNumber(data.conversionValueTarget.toString()) : '');
          setRoasTarget(data.roasTarget ? formatNumber(data.roasTarget.toString()) : '');
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

  const handleNumericChange = (value: string, setter: (value: string) => void) => {
    // Allow empty string, single decimal point, or valid number
    if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value.replace(/,/g, ''))) {
      setter(formatNumber(value));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      // Get current settings to preserve other values
      const currentSettingsResponse = await fetch('/api/settings');
      const currentSettings = await currentSettingsResponse.json();

      // Prepare the data with proper type conversion
      const settingsData = {
        ...currentSettings,
        targetFocus,
        conversionTarget: parseNumber(conversionTarget),
        cpaTarget: parseNumber(cpaTarget),
        conversionValueTarget: parseNumber(conversionValueTarget),
        roasTarget: parseNumber(roasTarget),
      };

      // Save to the API
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

      // Update local state with saved data and format numbers
      setTargetFocus(savedData.targetFocus || 'conversion');
      setConversionTarget(savedData.conversionTarget ? formatNumber(savedData.conversionTarget.toString()) : '');
      setCpaTarget(savedData.cpaTarget ? formatNumber(savedData.cpaTarget.toString()) : '');
      setConversionValueTarget(savedData.conversionValueTarget ? formatNumber(savedData.conversionValueTarget.toString()) : '');
      setRoasTarget(savedData.roasTarget ? formatNumber(savedData.roasTarget.toString()) : '');

      setSuccessMessage('Target settings saved successfully');
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
        <PageHeader title="Target Settings" hideFilters />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <Layout>
      <PageHeader title="Target Settings" hideFilters />
      <Box sx={{ padding: 3 }}>
        <SettingsBlock>
          <SettingsTitle variant="h6">Target Settings</SettingsTitle>
          <SettingsField>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="target-focus-label">Focus</InputLabel>
              <Select
                labelId="target-focus-label"
                value={targetFocus}
                label="Focus"
                onChange={(e) => setTargetFocus(e.target.value as 'conversion' | 'value')}
              >
                <MenuItem value="conversion">Conversion</MenuItem>
                <MenuItem value="value">Conversion Value</MenuItem>
              </Select>
            </FormControl>
          </SettingsField>

          {targetFocus === 'conversion' ? (
            <>
              <SettingsField>
                <FormControl fullWidth variant="outlined">
                  <TextField
                    fullWidth
                    variant="outlined"
                    label="Monthly Conversion Target"
                    value={conversionTarget}
                    onChange={(e) => handleNumericChange(e.target.value, setConversionTarget)}
                    placeholder="Enter your conversion target"
                    inputProps={{
                      inputMode: 'numeric',
                      pattern: '[0-9]*',
                    }}
                  />
                </FormControl>
              </SettingsField>
              <SettingsField>
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Target Cost Per Acquisition"
                  value={cpaTarget}
                  onChange={(e) => handleNumericChange(e.target.value, setCpaTarget)}
                  placeholder="Enter your CPA target"
                  InputProps={{
                    startAdornment: <Box component="span" sx={{ mr: 1 }}>€</Box>,
                  }}
                  inputProps={{
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                  }}
                />
              </SettingsField>
            </>
          ) : (
            <>
              <SettingsField>
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Monthly Conversion Value Target"
                  value={conversionValueTarget}
                  onChange={(e) => handleNumericChange(e.target.value, setConversionValueTarget)}
                  placeholder="Enter your conversion value target"
                  InputProps={{
                    startAdornment: <Box component="span" sx={{ mr: 1 }}>€</Box>,
                  }}
                  inputProps={{
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                  }}
                />
              </SettingsField>
              <SettingsField>
                <FormControl fullWidth variant="outlined">
                  <TextField
                    fullWidth
                    variant="outlined"
                    label="Target Return on Ad Spend"
                    value={roasTarget}
                    onChange={(e) => handleNumericChange(e.target.value, setRoasTarget)}
                    placeholder="Enter your ROAS target"
                    InputProps={{
                      endAdornment: <Box component="span" sx={{ ml: 1 }}>%</Box>,
                    }}
                    inputProps={{
                      inputMode: 'numeric',
                      pattern: '[0-9]*',
                    }}
                  />
                </FormControl>
              </SettingsField>
            </>
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          <SettingsField>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </SettingsField>
        </SettingsBlock>
      </Box>

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