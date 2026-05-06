import { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Card, CardContent, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, CircularProgress, Chip, Alert
} from '@mui/material';
import {
  Description as FileIcon,
  Rule as RuleIcon,
  Storage as StorageIcon,
  FolderSpecial as ProjectIcon,
  ArrowForward as ArrowIcon,
  CloudUpload as CloudUploadIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import client from '../api/client';
import { useStore } from '../store';

interface HomeDashboardProps {
  onNavigate?: (idx: number) => void;
}

const DTYPE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4'];
const RISK_COLORS: Record<string, string> = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444' };

function QualityGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const verdict = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Needs Attention' : 'Critical';
  const data = [{ value: score, fill: color }, { value: 100 - score, fill: '#f1f5f9' }];
  return (
    <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <ResponsiveContainer width={180} height={110}>
        <PieChart>
          <Pie data={data} cx="50%" cy="90%" startAngle={180} endAngle={0} innerRadius={55} outerRadius={75} dataKey="value" paddingAngle={0}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <Typography variant="h4" fontWeight={700} sx={{ mt: -3, color }}>{score.toFixed(0)}</Typography>
      <Typography variant="caption" color="text.secondary">Quality Score</Typography>
      <Typography variant="caption" fontWeight={600} sx={{ color, mt: 0.25 }}>{verdict}</Typography>
    </Box>
  );
}

export default function HomeDashboard({ onNavigate }: HomeDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [profilingReport, setProfilingReport] = useState<any | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setDataset = useStore((state) => state.setDataset);
  const currentDataset = useStore((state) => state.dataset);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (currentDataset) fetchProfilingReport(currentDataset.id);
    else setProfilingReport(null);
  }, [currentDataset?.id]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dsRes, projRes] = await Promise.all([
        client.get('/data/'),
        client.get('/projects/summary')
      ]);
      setDatasets(dsRes.data);
      setProjects(projRes.data);
    } catch {
      setError("Unable to load dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProfilingReport = async (datasetId: number) => {
    setReportLoading(true);
    try {
      const res = await client.get(`/profiling/latest/${datasetId}`);
      if (res.data?.report_data) {
        setProfilingReport(JSON.parse(res.data.report_data));
      } else {
        setProfilingReport(null);
      }
    } catch {
      setProfilingReport(null);
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 10 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">Initializing Intelligence Engine...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={fetchData}>Retry</Button>}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (datasets.length === 0 && projects.length === 0) {
    return (
      <Box sx={{ p: 10, textAlign: 'center', maxWidth: 800, mx: 'auto' }}>
        <Paper elevation={0} sx={{ p: 8, bgcolor: '#f8fafc', borderRadius: 4, border: '2px dashed #e2e8f0' }}>
          <StorageIcon sx={{ fontSize: 80, color: '#94a3b8', mb: 2 }} />
          <Typography variant="h4" fontWeight="bold" gutterBottom>Welcome to Profiler Pro</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Get started by uploading your first dataset. We'll automatically analyze its structure,
            detect business entities, and generate quality rules for you.
          </Typography>
          <Button
            variant="contained" size="large" startIcon={<CloudUploadIcon />}
            onClick={() => onNavigate?.(1)}
            sx={{ px: 6, py: 1.5, borderRadius: 2 }}
          >
            Upload Your First Dataset
          </Button>
        </Paper>
      </Box>
    );
  }

  // Derive profiling insights
  const columns: any[] = profilingReport?.columns ?? [];
  const dtypeCounts: Record<string, number> = {};
  const riskCounts: Record<string, number> = { Low: 0, Medium: 0, High: 0 };
  const topMissing = [...columns]
    .filter(c => c.null_percentage > 0)
    .sort((a, b) => b.null_percentage - a.null_percentage)
    .slice(0, 8);

  columns.forEach(c => {
    const d = c.dtype || 'unknown';
    dtypeCounts[d] = (dtypeCounts[d] ?? 0) + 1;
    const risk = c.risk_level || 'Low';
    riskCounts[risk] = (riskCounts[risk] ?? 0) + 1;
  });
  const dtypeData = Object.entries(dtypeCounts).map(([name, value]) => ({ name, value }));

  const issues: { severity: 'error' | 'warning' | 'info'; text: string }[] = [];
  if (profilingReport) {
    if (profilingReport.missing_percentage > 20)
      issues.push({ severity: 'error', text: `High missing data: ${profilingReport.missing_percentage}% cells empty` });
    else if (profilingReport.missing_percentage > 5)
      issues.push({ severity: 'warning', text: `Missing data: ${profilingReport.missing_percentage}% cells empty` });
    if (riskCounts.High > 0)
      issues.push({ severity: 'error', text: `${riskCounts.High} high-risk column${riskCounts.High > 1 ? 's' : ''} detected` });
    if (riskCounts.Medium > 0)
      issues.push({ severity: 'warning', text: `${riskCounts.Medium} medium-risk column${riskCounts.Medium > 1 ? 's' : ''} need attention` });
    const highNull = columns.filter(c => c.null_percentage > 50);
    if (highNull.length > 0)
      issues.push({ severity: 'warning', text: `${highNull.length} column${highNull.length > 1 ? 's' : ''} with >50% null values` });
    if (issues.length === 0)
      issues.push({ severity: 'info', text: 'No critical issues detected — data looks clean!' });
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: '#1e293b' }}>
        Enterprise Overview
      </Typography>

      {/* KPI Cards */}
      {(() => {
        const stats = [
          { label: 'Total Datasets', value: datasets.length, icon: <StorageIcon />, color: '#b60003' },
          { label: 'Total Projects', value: projects.length, icon: <ProjectIcon />, color: '#b60003' },
          { label: 'Total Rows Analyzed', value: datasets.reduce((acc, d) => acc + (d.row_count || 0), 0).toLocaleString(), icon: <FileIcon />, color: '#b60003' },
          { label: 'Rule Sets Created', value: '0', icon: <RuleIcon />, color: '#b60003' },
        ];
        return (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {stats.map((stat) => (
              <Grid item xs={12} sm={6} md={3} key={stat.label}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&::before': {
                      content: '""',
                      display: 'block',
                      height: 3,
                      bgcolor: stat.color,
                    },
                  }}
                >
                  <CardContent sx={{ display: 'flex', alignItems: 'center', pt: 2 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${stat.color}18`, color: stat.color, mr: 2, display: 'flex' }}>
                      {stat.icon}
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {stat.label}
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>{stat.value}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        );
      })()}

      {/* Dataset Insights — visible when a dataset is selected and profiled */}
      {currentDataset && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Dataset Insights — {currentDataset.filename}
          </Typography>

          {reportLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">Loading profiling report...</Typography>
            </Box>
          ) : !profilingReport ? (
            <Alert severity="info">Profiling is in progress or not yet run. Navigate to "Data Profiling" to trigger it.</Alert>
          ) : (
            <Grid container spacing={3}>
              {/* Quality Gauge */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Overall Quality</Typography>
                  <QualityGauge score={profilingReport.overall_score ?? 0} />
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {Object.entries(riskCounts).map(([level, count]) => (
                      <Chip key={level} label={`${count} ${level}`} size="small"
                        sx={{ bgcolor: RISK_COLORS[level] + '22', color: RISK_COLORS[level], fontWeight: 600 }} />
                    ))}
                  </Box>
                </Paper>
              </Grid>

              {/* Data Type Distribution */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Data Types</Typography>
                  {dtypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={dtypeData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name }) => name}>
                          {dtypeData.map((_, i) => <Cell key={i} fill={DTYPE_COLORS[i % DTYPE_COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', pt: 4 }}>No data</Typography>
                  )}
                </Paper>
              </Grid>

              {/* Top Missing Columns */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Top Missing-Value Columns</Typography>
                  {topMissing.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={topMissing} layout="vertical" margin={{ left: 80, right: 16, top: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="column_name" width={78} tick={{ fontSize: 11 }} />
                        <RechartsTooltip formatter={(v: number) => `${v}%`} />
                        <Bar dataKey="null_percentage" fill="#ef4444" name="Null %" barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" color="success.main" sx={{ textAlign: 'center', pt: 4 }}>
                      No missing values found!
                    </Typography>
                  )}
                </Paper>
              </Grid>

              {/* Top Issues */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Top Issues</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {issues.map((issue, i) => {
                      const Icon = issue.severity === 'error' ? ErrorIcon : issue.severity === 'warning' ? WarningIcon : InfoIcon;
                      const color = issue.severity === 'error' ? 'error' : issue.severity === 'warning' ? 'warning' : 'info';
                      return (
                        <Chip
                          key={i}
                          icon={<Icon />}
                          label={issue.text}
                          color={color}
                          variant="outlined"
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                      );
                    })}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      <Grid container spacing={4}>
        {/* Project Summaries */}
        <Grid item xs={12} lg={7}>
          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <ProjectIcon sx={{ mr: 1, color: '#b60003' }} /> Active Projects
          </Typography>
          <Grid container spacing={2}>
            {projects.map((proj) => (
              <Grid item xs={12} sm={6} key={proj.id}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.08)', bgcolor: 'background.default' } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700}>{proj.name}</Typography>
                    <Chip label={`${proj.dataset_count} datasets`} size="small" variant="outlined" />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {proj.description || 'No description provided.'}
                  </Typography>
                  <Divider sx={{ mb: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {proj.total_rows.toLocaleString()} total rows
                    </Typography>
                    <Button size="small" endIcon={<ArrowIcon />}>Explore</Button>
                  </Box>
                </Paper>
              </Grid>
            ))}
            {projects.length === 0 && (
              <Grid item xs={12}>
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No projects yet. Create one from the Load Data page.
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Grid>

        {/* Recent Datasets */}
        <Grid item xs={12} lg={5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">Recent Datasets</Typography>
            <Button variant="text" size="small" sx={{ color: '#b60003' }}>View All</Button>
          </Box>
          <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Filename</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Rows</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {datasets.slice(0, 8).map((ds) => (
                  <TableRow
                    key={ds.id}
                    hover
                    onClick={() => setDataset(ds)}
                    sx={{ cursor: 'pointer', '&:hover td': { bgcolor: '#fef2f2' } }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            px: 0.75, py: 0.25, borderRadius: 0.75,
                            bgcolor: 'action.hover',
                            fontSize: '0.6rem', fontWeight: 700,
                            color: 'text.secondary', textTransform: 'uppercase',
                            flexShrink: 0,
                          }}
                        >
                          {ds.filename.split('.').pop() ?? 'FILE'}
                        </Box>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>{ds.filename}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">{ds.row_count?.toLocaleString() || '—'}</TableCell>
                  </TableRow>
                ))}
                {datasets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} align="center" sx={{ py: 4, color: 'text.disabled' }}>
                      No datasets found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
}
