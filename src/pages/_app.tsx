import React from 'react';
import { AppProps } from 'next/app';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SessionProvider } from 'next-auth/react';
import { theme } from '../theme/theme';
import { AccountProvider } from '../context/AccountContext';

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AccountProvider>
          <Component {...pageProps} />
        </AccountProvider>
      </ThemeProvider>
    </SessionProvider>
  );
} 