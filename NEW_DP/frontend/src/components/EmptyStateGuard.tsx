// frontend/src/components/EmptyStateGuard.tsx
import { Box, Button, Typography, Paper } from '@mui/material';
import { Storage as StorageIcon } from '@mui/icons-material';
import { useStore } from '../store';
import type { ReactNode } from 'react';

interface EmptyStateGuardProps {
  children: ReactNode;
  onNavigateToLoad: () => void;
}

export default function EmptyStateGuard({ children, onNavigateToLoad }: EmptyStateGuardProps) {
  const dataset = useStore((state) => state.dataset);

  if (dataset) return <>{children}</>;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 480 }}>
      <Paper
        variant="outlined"
        sx={{ p: 6, textAlign: 'center', maxWidth: 440, borderStyle: 'dashed', borderRadius: 3 }}
      >
        <StorageIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" fontWeight={700} gutterBottom>
          No dataset loaded
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Load a dataset first to use this feature. Supported formats: CSV, Excel, Parquet, JSON, Feather.
        </Typography>
        <Button
          variant="contained"
          onClick={onNavigateToLoad}
          sx={{ bgcolor: '#b60003', '&:hover': { bgcolor: '#8f0002' } }}
        >
          Go to Load Data
        </Button>
      </Paper>
    </Box>
  );
}
