import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { Box, CircularProgress, Container, Typography } from '@mui/material';

export default function SignOut() {
  useEffect(() => {
    signOut({ callbackUrl: '/auth/signin' });
  }, []);

  return (
    <Container>
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Signing out...
        </Typography>
      </Box>
    </Container>
  );
} 