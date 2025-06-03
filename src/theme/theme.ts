import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#191a37',
    },
    secondary: {
      main: '#cc3366',
    },
    grey: {
      100: '#F5F5F5',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
    background: {
      default: '#f8f4fc',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: 'Poppins',
      fontSize: '2rem',
      fontWeight: 600,
    },
    h2: {
      fontFamily: 'Poppins',
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h3: {
      fontFamily: 'Poppins',
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h4: {
      fontFamily: 'Poppins',
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    body1: {
      fontFamily: 'Poppins',
    },
    body2: {
      fontFamily: 'Poppins',
    },
    button: {
      fontFamily: 'Poppins',
    },
    subtitle1: {
      fontFamily: 'Poppins',
    },
    subtitle2: {
      fontFamily: 'Poppins',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        },
      },
    },
  },
}); 