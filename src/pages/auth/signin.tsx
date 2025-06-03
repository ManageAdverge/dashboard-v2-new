import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  Alert,
  styled,
  Link,
} from '@mui/material';

const StyledPaper = styled(Paper)(({ theme }) => ({
  marginTop: theme.spacing(8),
  padding: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
  borderRadius: '8px',
  position: 'relative',
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: -60,
  left: 0,
  width: '150px',
  height: '40px',
}));

const Form = styled('form')(({ theme }) => ({
  width: '100%',
  marginTop: theme.spacing(1),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '4px',
    backgroundColor: 'white',
  },
  '& .MuiOutlinedInput-input': {
    padding: '14px',
  },
}));

const SignInButton = styled(Button)(({ theme }) => ({
  padding: '12px',
  backgroundColor: '#1A1B41',
  borderRadius: '4px',
  textTransform: 'uppercase',
  fontWeight: 600,
  '&:hover': {
    backgroundColor: '#2A2B51',
  },
}));

const ForgotPasswordLink = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(1),
  color: theme.palette.grey[600],
  textTransform: 'uppercase',
  fontWeight: 500,
  fontSize: '0.875rem',
  '&:hover': {
    backgroundColor: 'transparent',
    color: theme.palette.grey[800],
    textDecoration: 'underline',
  },
}));

const BackToSignInLink = styled(Button)(({ theme }) => ({
  color: '#1A1B41',
  textTransform: 'uppercase',
  fontWeight: 500,
  fontSize: '0.875rem',
  '&:hover': {
    backgroundColor: 'transparent',
    textDecoration: 'underline',
  },
}));

const ErrorAlert = styled(Alert)(({ theme }) => ({
  backgroundColor: '#FFE8E8',
  color: '#8B0000',
  '& .MuiAlert-icon': {
    color: '#8B0000',
  },
}));

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        // Fetch session to get user role
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        const userRole = sessionData?.user?.role;
        if (userRole === 'ADMIN') {
        router.push('/settings');
        } else {
          router.push('/');
        }
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setForgotPasswordSuccess(true);
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
        setForgotPasswordSuccess(false);
      }, 3000);
    } catch (error: any) {
      setForgotPasswordError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <Container component="main" maxWidth="xs">
        <StyledPaper>
          <LogoContainer>
            <Image
              src="/adverge_blue_letters.png"
              alt="Adverge Logo"
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </LogoContainer>
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            Forgot Password
          </Typography>
          <Form onSubmit={handleForgotPassword}>
            {forgotPasswordError && (
              <ErrorAlert severity="error" sx={{ width: '100%' }}>
                {forgotPasswordError}
              </ErrorAlert>
            )}
            {forgotPasswordSuccess && (
              <Alert severity="success" sx={{ width: '100%' }}>
                If an account exists with this email, you will receive a password reset link.
              </Alert>
            )}
            <Box sx={{ width: '100%' }}>
              <Typography variant="caption" color="textSecondary" sx={{ mb: 1 }}>
                Email Address *
              </Typography>
              <StyledTextField
                required
                fullWidth
                id="email"
                name="email"
                autoComplete="email"
                autoFocus
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </Box>
            <SignInButton
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
            >
              {isLoading ? 'SENDING...' : 'SEND RESET LINK'}
            </SignInButton>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <BackToSignInLink
                variant="text"
                onClick={() => setShowForgotPassword(false)}
              >
                BACK TO SIGN IN
              </BackToSignInLink>
            </Box>
          </Form>
        </StyledPaper>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <StyledPaper>
        <LogoContainer>
          <Image
            src="/adverge_blue_letters.png"
            alt="Adverge Logo"
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </LogoContainer>
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          Sign In
        </Typography>
        <Form onSubmit={handleSubmit}>
          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}
          <StyledTextField
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <StyledTextField
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <SignInButton
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'SIGN IN'}
          </SignInButton>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <ForgotPasswordLink
              variant="text"
              onClick={() => setShowForgotPassword(true)}
            >
              FORGOT PASSWORD?
            </ForgotPasswordLink>
          </Box>
        </Form>
      </StyledPaper>
    </Container>
  );
} 