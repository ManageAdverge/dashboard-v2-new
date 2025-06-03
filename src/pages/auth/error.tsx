import { useRouter } from 'next/router';
import { Box, Button, Container, Typography, Alert } from '@mui/material';

export default function AuthError() {
  const router = useRouter();
  const { error } = router.query;

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'Configuration':
        return 'There is a problem with the server configuration.';
      case 'AccessDenied':
        return 'You do not have permission to sign in.';
      case 'Verification':
        return 'The verification token has expired or has already been used.';
      default:
        return 'An error occurred during authentication.';
    }
  };

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
        <Typography component="h1" variant="h4" gutterBottom>
          Authentication Error
        </Typography>
        <Alert severity="error" sx={{ mt: 2, mb: 4 }}>
          {error ? getErrorMessage(error as string) : 'An unknown error occurred'}
        </Alert>
        <Button
          variant="contained"
          onClick={() => router.push('/auth/signin')}
        >
          Return to Sign In
        </Button>
      </Box>
    </Container>
  );
} 