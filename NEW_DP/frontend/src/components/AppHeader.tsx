// frontend/src/components/AppHeader.tsx
import { Box, Chip, IconButton, Tooltip, Typography, Popover, Button, Divider } from '@mui/material';
import {
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { useStore } from '../store';

interface AppHeaderProps {
  title: string;
  breadcrumb?: string[];
  onNavigateToLoad: () => void;
}

export default function AppHeader({ title, breadcrumb, onNavigateToLoad }: AppHeaderProps) {
  const themeMode = useStore((state) => state.themeMode);
  const toggleThemeMode = useStore((state) => state.toggleThemeMode);
  const currentDataset = useStore((state) => state.dataset);
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? 'U';

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      {/* Main strip */}
      <Box
        sx={{
          height: 56,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left: Page title */}
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem' }}>
          {title}
        </Typography>

        {/* Center: Dataset chip */}
        <Box>
          {currentDataset ? (
            <Chip
              icon={<StorageIcon sx={{ fontSize: '16px !important' }} />}
              label={`${currentDataset.filename}${currentDataset.row_count ? ` · ${currentDataset.row_count.toLocaleString()} rows` : ''}`}
              size="small"
              onClick={onNavigateToLoad}
              sx={{
                bgcolor: 'action.hover',
                fontWeight: 500,
                cursor: 'pointer',
                maxWidth: 320,
                '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
              }}
            />
          ) : (
            <Typography variant="caption" color="text.secondary">
              No dataset loaded
            </Typography>
          )}
        </Box>

        {/* Right: Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            <IconButton size="small" onClick={toggleThemeMode}>
              {themeMode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Tooltip title={user?.username ?? 'Account'}>
            <Box
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: '#b60003',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                ml: 0.5,
              }}
            >
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{initials}</Typography>
            </Box>
          </Tooltip>
        </Box>
      </Box>

      {/* Breadcrumb row */}
      {breadcrumb && breadcrumb.length > 0 && (
        <Box sx={{ px: 3, pb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {breadcrumb.map((crumb, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {i > 0 && <Typography variant="caption" color="text.disabled">›</Typography>}
              <Typography
                variant="caption"
                color={i === breadcrumb.length - 1 ? 'text.primary' : 'text.secondary'}
                fontWeight={i === breadcrumb.length - 1 ? 600 : 400}
              >
                {crumb}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* User popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 180, mt: 1 } } }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="body2" fontWeight={600}>{user?.username}</Typography>
          <Typography variant="caption" color="text.secondary">Signed in</Typography>
        </Box>
        <Divider />
        <Box sx={{ p: 1 }}>
          <Button fullWidth size="small" color="error" onClick={() => { setAnchorEl(null); logout(); }}>
            Sign out
          </Button>
        </Box>
      </Popover>
    </Box>
  );
}
