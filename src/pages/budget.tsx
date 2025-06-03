import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  styled,
  TextField,
  Button,
  Snackbar,
  Alert,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/PageHeader';

const BudgetActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
}));

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  maxHeight: 'calc(100vh - 250px)',
  [theme.breakpoints.down('sm')]: {
    maxHeight: 'calc(100vh - 300px)',
  },
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 'bold',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  padding: '12px 8px',
  whiteSpace: 'nowrap',
  [theme.breakpoints.down('sm')]: {
    padding: '8px 4px',
    fontSize: '0.875rem',
  },
}));

const TableActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: theme.spacing(2),
  gap: theme.spacing(2),
  flexDirection: 'column',
  [theme.breakpoints.up('sm')]: {
    flexDirection: 'row',
  },
}));

const TypeTextField = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-input': {
    fontWeight: 500,
    fontSize: '1rem',
    [theme.breakpoints.down('sm')]: {
      fontSize: '0.875rem',
    },
  },
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    width: '200px',
  },
}));

const ValueTextField = styled(TextField)(({ theme }) => ({
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    width: '90px',
  },
  '& .MuiInputBase-root': {
    padding: '4px 8px',
  },
  '& .MuiInputBase-input': {
    padding: '4px',
    fontSize: '0.875rem',
    [theme.breakpoints.down('sm')]: {
      fontSize: '0.75rem',
    },
  },
}));

const CurrencySelect = styled(FormControl)(({ theme }) => ({
  minWidth: 100,
  [theme.breakpoints.down('sm')]: {
    width: '100%',
  },
}));

const CompactTableCell = styled(TableCell)(({ theme }) => ({
  padding: '8px',
  [theme.breakpoints.down('sm')]: {
    padding: '4px',
  },
}));

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const currencies = {
  USD: { symbol: '$', label: 'Dollar' },
  EUR: { symbol: '€', label: 'Euro' },
  GBP: { symbol: '£', label: 'Pound' },
};

interface BudgetRow {
  id: number;
  type: string;
  values: { [key: string]: string };
}

export default function Budget() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<keyof typeof currencies>('USD');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        const response = await fetch('/api/budget');
        if (response.ok) {
          const data = await response.json();
          if (data.rows.length > 0) {
            // Format the numbers with thousands separators when loading
            const formattedData = data.rows.map((row: BudgetRow) => ({
              ...row,
              values: Object.entries(row.values).reduce((acc, [month, value]) => ({
                ...acc,
                [month]: value ? formatNumber(value.toString()) : ''
              }), {})
            }));
            setRows(formattedData);
            setSelectedCurrency(data.currency as keyof typeof currencies);
          } else {
            setRows([{
              id: 1,
              type: '',
              values: months.reduce((acc, month) => ({ ...acc, [month]: '' }), {})
            }]);
          }
        } else {
          setError('Failed to load budget data');
        }
      } catch (error) {
        console.error('Error fetching budget:', error);
        setError('Failed to load budget data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBudget();
  }, []);

  const handleAddRow = () => {
    const newRow: BudgetRow = {
      id: rows.length + 1,
      type: '',
      values: months.reduce((acc, month) => ({ ...acc, [month]: '' }), {})
    };
    setRows([...rows, newRow]);
  };

  const handleDeleteRow = (id: number) => {
    setRows(rows.filter(row => row.id !== id));
  };

  const handleTypeChange = (rowId: number, value: string) => {
    setRows(rows.map(row => {
      if (row.id === rowId) {
        return { ...row, type: value };
      }
      return row;
    }));
  };

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

  const handleCellChange = (rowId: number, month: string, value: string) => {
    // Allow empty string, single decimal point, or valid number
    if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value.replace(/,/g, ''))) {
      const formattedValue = value ? formatNumber(value) : '';
      
      setRows(rows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            values: {
              ...row.values,
              [month]: formattedValue
            }
          };
        }
        return row;
      }));
    }
  };

  const handleCurrencyChange = (event: any) => {
    setSelectedCurrency(event.target.value);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    // Validate that at least one row has a type
    const hasValidRow = rows.some(row => row.type.trim() !== '');
    if (!hasValidRow) {
      setError('Please enter at least one budget type');
      setIsSaving(false);
      return;
    }

    try {
      // Convert the formatted values back to numbers before saving
      const processedRows = rows.map(row => ({
        ...row,
        type: row.type.trim(),
        values: Object.entries(row.values).reduce((acc, [month, value]) => ({
          ...acc,
          [month]: value ? value.replace(/,/g, '') : ''
        }), {})
      }));

      const response = await fetch('/api/budget', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          rows: processedRows,
          currency: selectedCurrency
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Format the received data with thousands separators
        const formattedData = data.rows.map((row: BudgetRow) => ({
          ...row,
          values: Object.entries(row.values).reduce((acc, [month, value]) => ({
            ...acc,
            [month]: value ? formatNumber(value.toString()) : ''
          }), {})
        }));
        setRows(formattedData);
        setSelectedCurrency(data.currency as keyof typeof currencies);
        setShowSuccess(true);
      } else {
        const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error;
        console.error('Save error:', errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error saving budget:', error);
      setError('Failed to save budget data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateMonthlyTotals = () => {
    return months.reduce((acc, month) => {
      const total = rows.reduce((sum, row) => {
        const value = parseFloat(row.values[month].replace(/,/g, '')) || 0;
        return sum + value;
      }, 0);
      return { 
        ...acc, 
        [month]: formatNumber(total.toFixed(2))
      };
    }, {} as { [key: string]: string });
  };

  if (isLoading) {
    return (
      <Layout>
        <PageHeader title="Budget" hideFilters />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader title="Budget" hideFilters />
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <BudgetActions>
          <CurrencySelect>
            <Select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as keyof typeof currencies)}
              size="small"
            >
              {Object.entries(currencies).map(([key, { label }]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </CurrencySelect>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            fullWidth={isMobile}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </BudgetActions>

        <StyledTableContainer>
          <Table stickyHeader size="small" aria-label="budget table">
            <TableHead>
              <TableRow>
                <StyledTableCell>Type</StyledTableCell>
                {months.map((month) => (
                  <StyledTableCell key={month} align="right">
                    {isMobile ? month.slice(0, 3) : month}
                  </StyledTableCell>
                ))}
                <StyledTableCell align="center" sx={{ width: { xs: 40, sm: 50 } }}>
                  {!isMobile && "Delete"}
                </StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <CompactTableCell>
                    <TypeTextField
                      size="small"
                      value={row.type}
                      onChange={(e) => handleTypeChange(row.id, e.target.value)}
                      placeholder="Enter type..."
                    />
                  </CompactTableCell>
                  {months.map((month) => (
                    <CompactTableCell key={month} align="right">
                      <ValueTextField
                        size="small"
                        value={row.values[month]}
                        onChange={(e) => handleCellChange(row.id, month, e.target.value)}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">{currencies[selectedCurrency].symbol}</InputAdornment>,
                          style: { textAlign: 'right' }
                        }}
                        inputProps={{
                          style: { textAlign: 'right' }
                        }}
                      />
                    </CompactTableCell>
                  ))}
                  <CompactTableCell align="center">
                    <IconButton
                      onClick={() => handleDeleteRow(row.id)}
                      color="error"
                      size="small"
                      aria-label="delete row"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CompactTableCell>
                </TableRow>
              ))}
              <TableRow>
                <CompactTableCell sx={{ fontWeight: 'bold' }}>Total</CompactTableCell>
                {months.map((month) => (
                  <CompactTableCell key={month} align="right" sx={{ fontWeight: 'bold' }}>
                    {currencies[selectedCurrency].symbol}{calculateMonthlyTotals()[month]}
                  </CompactTableCell>
                ))}
                <CompactTableCell />
              </TableRow>
            </TableBody>
          </Table>
        </StyledTableContainer>

        <TableActions>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddRow}
            fullWidth={isMobile}
          >
            Add Row
          </Button>
        </TableActions>
      </Box>

      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setShowSuccess(false)}>
          Budget data saved successfully
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={3000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
    </Layout>
  );
} 