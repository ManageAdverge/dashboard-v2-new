import React from 'react';
import { Box, Typography } from '@mui/material';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        padding: 2,
        textAlign: 'center',
        borderTop: '1px solid',
        borderColor: 'divider',
        mt: 'auto',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        © {currentYear} Adverge. All rights reserved.
      </Typography>
    </Box>
  );
}; 