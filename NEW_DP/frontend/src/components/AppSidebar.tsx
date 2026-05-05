// frontend/src/components/AppSidebar.tsx
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import {
  GridView as GridViewIcon,
  CloudUpload as CloudUploadIcon,
  TableChart as TableChartIcon,
  Tune as TuneIcon,
  Download as DownloadIcon,
  BarChart as BarChartIcon,
  ContentCopy as ContentCopyIcon,
  CompareArrows as CompareArrowsIcon,
  FolderOpen as FolderOpenIcon,
  Rule as RuleIcon,
  Verified as VerifiedIcon,
  Timeline as TimelineIcon,
  Workspaces as WorkspacesIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import type { ReactNode } from 'react';

interface NavItem {
  label: string;
  icon: ReactNode;
  index: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', icon: <GridViewIcon fontSize="small" />, index: 0 }],
  },
  {
    label: 'Data',
    items: [
      { label: 'Load Data', icon: <CloudUploadIcon fontSize="small" />, index: 1 },
      { label: 'Preview', icon: <TableChartIcon fontSize="small" />, index: 9 },
      { label: 'Transform', icon: <TuneIcon fontSize="small" />, index: 10 },
      { label: 'Export', icon: <DownloadIcon fontSize="small" />, index: 11 },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { label: 'Data Profiling', icon: <BarChartIcon fontSize="small" />, index: 3 },
      { label: 'Find Duplicates', icon: <ContentCopyIcon fontSize="small" />, index: 4 },
      { label: 'Compare', icon: <CompareArrowsIcon fontSize="small" />, index: 6 },
      { label: 'Multi-File', icon: <FolderOpenIcon fontSize="small" />, index: 7 },
    ],
  },
  {
    label: 'Quality & Governance',
    items: [
      { label: 'Rule Generator', icon: <RuleIcon fontSize="small" />, index: 2 },
      { label: 'Data Quality', icon: <VerifiedIcon fontSize="small" />, index: 5 },
      { label: 'Data Drift', icon: <TimelineIcon fontSize="small" />, index: 8 },
      { label: 'Workspace', icon: <WorkspacesIcon fontSize="small" />, index: 12 },
    ],
  },
];

interface AppSidebarProps {
  activeIndex: number;
  onNavigate: (index: number) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function AppSidebar({ activeIndex, onNavigate, collapsed, onToggleCollapse }: AppSidebarProps) {
  const width = collapsed ? 64 : 240;

  return (
    <Box
      sx={{
        width,
        minWidth: width,
        height: '100vh',
        bgcolor: '#221E1F',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <Box sx={{ px: collapsed ? 1.5 : 2.5, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            bgcolor: '#b60003',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1rem', lineHeight: 1 }}>P</Typography>
        </Box>
        {!collapsed && (
          <Typography sx={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
            Profiler Pro
          </Typography>
        )}
      </Box>

      {/* Nav groups */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
        {NAV_GROUPS.map((group, gi) => (
          <Box key={group.label}>
            {gi > 0 && (
              <Box sx={{ height: '1px', bgcolor: '#2d3139', mx: collapsed ? 1 : 2, my: 1 }} />
            )}
            {!collapsed && (
              <Typography
                sx={{
                  px: 2.5,
                  py: 0.5,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#575656',
                  textTransform: 'uppercase',
                }}
              >
                {group.label}
              </Typography>
            )}
            {group.items.map((item) => {
              const isActive = activeIndex === item.index;
              return (
                <Tooltip key={item.index} title={collapsed ? item.label : ''} placement="right">
                  <Box
                    onClick={() => onNavigate(item.index)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(item.index); } }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: collapsed ? 0 : 2.5,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      height: 40,
                      cursor: 'pointer',
                      position: 'relative',
                      bgcolor: isActive ? 'rgba(182,0,3,0.10)' : 'transparent',
                      borderLeft: isActive ? '3px solid #b60003' : '3px solid transparent',
                      '&:hover': { bgcolor: isActive ? 'rgba(182,0,3,0.10)' : '#2d3139' },
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <Box sx={{ color: isActive ? '#ffffff' : '#9ca3af', display: 'flex', flexShrink: 0 }}>
                      {item.icon}
                    </Box>
                    {!collapsed && (
                      <Typography
                        sx={{
                          fontSize: '0.8125rem',
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? '#ffffff' : '#d1d5db',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.label}
                      </Typography>
                    )}
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        ))}
      </Box>

      {/* Collapse toggle */}
      <Box
        sx={{
          px: collapsed ? 1.5 : 2,
          py: 2,
          borderTop: '1px solid #2d3139',
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-end',
        }}
      >
        <IconButton onClick={onToggleCollapse} size="small" sx={{ color: '#575656', '&:hover': { color: '#d1d5db' } }}>
          {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
        </IconButton>
      </Box>
    </Box>
  );
}
