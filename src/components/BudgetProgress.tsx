import React from 'react';
import { Box, Paper, Typography, LinearProgress, styled } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { startOfMonth, endOfMonth, differenceInCalendarDays } from 'date-fns';

const ProgressContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
}));

const ProgressBar = styled(LinearProgress)(({ theme }) => ({
  height: 12,
  borderRadius: 6,
  backgroundColor: theme.palette.grey[200],
  '& .MuiLinearProgress-bar': {
    borderRadius: 6,
  },
}));

const ProgressInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(2),
}));

interface BudgetProgressProps {
  currentCosts: number;
  totalBudget: number;
  currency: string;
}

export const BudgetProgress: React.FC<BudgetProgressProps> = ({
  currentCosts,
  totalBudget,
  currency,
}) => {
  const theme = useTheme();
  const progress = (currentCosts / totalBudget) * 100;
  
  const getProgressColor = () => {
    if (progress >= 90) return theme.palette.error.main;
    if (progress >= 75) return theme.palette.warning.main;
    return theme.palette.primary.main;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <ProgressContainer>
      <Typography variant="h6" gutterBottom>
        Monthly Budget Progress
      </Typography>
      <ProgressBar
        variant="determinate"
        value={Math.min(progress, 100)}
        sx={{
          '& .MuiLinearProgress-bar': {
            backgroundColor: getProgressColor(),
          },
        }}
      />
      <ProgressInfo>
        <Typography variant="body2" color="text.secondary">
          {formatCurrency(currentCosts)} of {formatCurrency(totalBudget)}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: getProgressColor(),
            fontWeight: 'bold',
          }}
        >
          {progress.toFixed(1)}%
        </Typography>
      </ProgressInfo>
      <Box mt={1} textAlign="center">
        {(() => {
          const now = new Date();
          const start = startOfMonth(now);
          const end = endOfMonth(now);
          const totalDays = differenceInCalendarDays(end, start) + 1;
          const daysPassed = differenceInCalendarDays(now, start) + 1;
          const monthProgress = (daysPassed / totalDays) * 100;
          return (
            <Typography variant="body2" color="text.secondary">
              {`Month progress: ${monthProgress.toFixed(1)}% (${daysPassed} of ${totalDays} days)`}
            </Typography>
          );
        })()}
      </Box>
    </ProgressContainer>
  );
}; 