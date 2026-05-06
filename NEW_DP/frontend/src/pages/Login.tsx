// frontend/src/pages/Login.tsx
import { useState, type FormEvent } from 'react';
import { Box, Button, TextField, Typography, Alert, CircularProgress, Link, useTheme } from '@mui/material';
import { useStore } from '../store';
import client from '../api/client';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const setToken = useStore((state) => state.setToken);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      if (isRegistering) {
        await client.post('/auth/register', { username, password });
        setSuccessMsg('Account created! Signing you in...');
        setTimeout(() => setIsRegistering(false), 2000);
      } else {
        const data = new URLSearchParams();
        data.append('username', username);
        data.append('password', password);
        const res = await client.post('/auth/token', data, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        setToken(res.data.access_token);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left panel */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: '50%',
          bgcolor: '#221E1F',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 6,
          position: 'relative',
          overflow: 'hidden',
          backgroundImage: 'radial-gradient(circle, #2d3139 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              bgcolor: '#b60003',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.75rem', lineHeight: 1 }}>P</Typography>
          </Box>
          <Typography variant="h4" fontWeight={700} sx={{ color: '#ffffff', mb: 1 }}>
            Profiler Pro
          </Typography>
          <Typography sx={{ color: '#9ca3af', fontSize: '0.95rem', maxWidth: 320, lineHeight: 1.6 }}>
            Enterprise data profiling, quality, and governance — in one place.
          </Typography>
        </Box>
      </Box>

      {/* Right panel */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          bgcolor: isDark ? '#1a1d23' : '#ffffff',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box sx={{ width: 36, height: 36, bgcolor: '#b60003', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>P</Typography>
            </Box>
            <Typography variant="h6" fontWeight={700}>Profiler Pro</Typography>
          </Box>

          <Typography variant="h5" fontWeight={700} gutterBottom>
            {isRegistering ? 'Create an account' : 'Welcome back'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {isRegistering ? 'Fill in the details below to get started.' : 'Sign in to your account to continue.'}
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth margin="normal" label="Username" required autoFocus
              value={username} onChange={(e) => setUsername(e.target.value)}
              size="small"
            />
            <TextField
              fullWidth margin="normal" label="Password" type="password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              size="small"
            />
            {!isRegistering && (
              <Box sx={{ textAlign: 'right', mt: 0.5 }}>
                <Link component="button" type="button" variant="caption" color="primary" underline="hover"
                  onClick={() => {}}>
                  Forgot password?
                </Link>
              </Box>
            )}
            <Button
              type="submit" fullWidth variant="contained"
              disabled={loading || !username || !password}
              sx={{ mt: 3, mb: 2, py: 1.25, bgcolor: '#b60003', '&:hover': { bgcolor: '#8f0002' } }}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {loading ? 'Please wait...' : isRegistering ? 'Create account' : 'Sign in'}
            </Button>
          </Box>

          <Box textAlign="center">
            <Link
              component="button" variant="body2"
              onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccessMsg(''); }}
            >
              {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </Link>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
