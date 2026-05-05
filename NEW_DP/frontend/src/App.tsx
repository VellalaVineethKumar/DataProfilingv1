// frontend/src/App.tsx
import { lazy, Suspense, useMemo } from 'react';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { useStore } from './store';
import { buildTheme } from './theme';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

export default function App() {
  const token = useStore((state) => state.token);
  const themeMode = useStore((state) => state.themeMode);
  const theme = useMemo(() => buildTheme(themeMode), [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Suspense
        fallback={
          <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress color="primary" />
          </Box>
        }
      >
        {token ? <Dashboard /> : <Login />}
      </Suspense>
    </ThemeProvider>
  );
}
