// frontend/src/pages/Dashboard.tsx
import { lazy, Suspense, useMemo, useState, type ComponentType } from 'react';
import { Box, CircularProgress } from '@mui/material';
import AppSidebar from '../components/AppSidebar';
import AppHeader from '../components/AppHeader';
import EmptyStateGuard from '../components/EmptyStateGuard';

const HomeDashboard = lazy(() => import('../components/HomeDashboard'));
const LoadData = lazy(() => import('../components/LoadData'));
const RuleGenerator = lazy(() => import('../components/RuleGenerator'));
const Profiling = lazy(() => import('../components/Profiling'));
const Duplicates = lazy(() => import('../components/Duplicates'));
const DataQuality = lazy(() => import('../components/DataQuality'));
const Compare = lazy(() => import('../components/Compare'));
const MultiFile = lazy(() => import('../components/MultiFile'));
const Drift = lazy(() => import('../components/Drift'));
const Preview = lazy(() => import('../components/Preview'));
const Transform = lazy(() => import('../components/Transform'));
const Export = lazy(() => import('../components/Export'));
const Workspace = lazy(() => import('../components/Workspace'));

const TAB_TITLES = [
  'Dashboard', 'Load Data', 'Rule Generator', 'Data Profiling',
  'Find Duplicates', 'Data Quality', 'Compare', 'Multi-File',
  'Data Drift', 'Preview', 'Transform', 'Export', 'Workspace',
];

const TAB_BREADCRUMBS: Record<number, string[]> = {
  3: ['Analysis', 'Data Profiling'],
  4: ['Analysis', 'Find Duplicates'],
  6: ['Analysis', 'Compare'],
  7: ['Analysis', 'Multi-File'],
  2: ['Quality & Governance', 'Rule Generator'],
  5: ['Quality & Governance', 'Data Quality'],
  8: ['Quality & Governance', 'Data Drift'],
  12: ['Quality & Governance', 'Workspace'],
  9: ['Data', 'Preview'],
  10: ['Data', 'Transform'],
  11: ['Data', 'Export'],
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const tabComponents = useMemo<ComponentType[]>(() => {
    const guard = (C: ComponentType) => () => (
      <EmptyStateGuard onNavigateToLoad={() => setActiveTab(1)}>
        <C />
      </EmptyStateGuard>
    );
    return [
      () => <HomeDashboard onNavigate={setActiveTab} />,
      () => <LoadData onNext={() => setActiveTab(3)} />,
      guard(RuleGenerator),
      guard(Profiling),
      guard(Duplicates),
      guard(DataQuality),
      guard(Compare),
      guard(MultiFile),
      guard(Drift),
      guard(Preview),
      guard(Transform),
      Export,
      guard(Workspace),
    ];
  }, []);

  const ActiveTabComponent = tabComponents[activeTab];
  const breadcrumb = TAB_BREADCRUMBS[activeTab];

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppSidebar
        activeIndex={activeTab}
        onNavigate={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AppHeader
          title={TAB_TITLES[activeTab]}
          breadcrumb={breadcrumb}
          onNavigateToLoad={() => setActiveTab(1)}
        />

        {/* Load Data (tab 1) gets the full canvas — no padding/maxWidth wrapper */}
        {activeTab === 1 ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.default' }}>
            <Suspense
              fallback={
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress />
                </Box>
              }
            >
              <ActiveTabComponent />
            </Suspense>
          </Box>
        ) : (
          <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: 'background.default' }}>
            <Box sx={{ maxWidth: 1280, mx: 'auto', p: 3 }}>
              <Suspense
                fallback={
                  <Box sx={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularProgress />
                  </Box>
                }
              >
                <ActiveTabComponent />
              </Suspense>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
