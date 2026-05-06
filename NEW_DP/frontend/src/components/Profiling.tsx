import { Fragment, useState, useEffect } from 'react';
import {
  Box, Button, Typography, Paper, CircularProgress, Card, CardContent, Grid,
  Tabs, Tab, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, LinearProgress, Collapse, IconButton, Stepper, Step, StepLabel
} from '@mui/material';
import { useTaskProgress } from '../hooks/useTaskProgress';
import {
  Dashboard as DashboardIcon,
  ViewColumn as ViewColumnIcon,
  Rule as RuleIcon,
  FileDownload as FileDownloadIcon,
  PlayArrow as PlayArrowIcon,
  Assessment as AssessmentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import client from '../api/client';
import { useStore } from '../store';

const DTYPE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4'];

function ColumnProfilesTable({ columns }: { columns: any[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = (name: string) => setExpanded(prev => prev === name ? null : name);

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" gutterBottom>Column Profiles</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Click a row to expand inline charts for that column.
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell width={36} />
              <TableCell sx={{ fontWeight: 'bold' }}>Column</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Semantic Type</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Null %</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Unique %</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Risk</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {columns.map((col: any) => {
              const isOpen = expanded === col.column_name;
              const chartData = [
                { metric: 'Null %', value: col.null_percentage ?? 0 },
                { metric: 'Unique %', value: col.unique_percentage ?? 0 },
                { metric: 'Fill %', value: 100 - (col.null_percentage ?? 0) },
              ];
              return (
                <Fragment key={col.column_name}>
                  <TableRow hover onClick={() => toggle(col.column_name)} sx={{ cursor: 'pointer' }}>
                    <TableCell padding="checkbox">
                      <IconButton size="small">
                        {isOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{col.column_name}</TableCell>
                    <TableCell><Chip label={col.dtype} size="small" variant="outlined" /></TableCell>
                    <TableCell>
                      <Chip
                        label={col.semantic_type || 'Unknown'}
                        size="small"
                        color="secondary"
                        variant={col.semantic_type ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography color={col.null_percentage > 10 ? 'error' : 'text.primary'} variant="body2">
                        {col.null_percentage?.toFixed(1)}%
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{col.unique_percentage?.toFixed(1)}%</TableCell>
                    <TableCell>
                      <Chip
                        label={col.risk_level || 'Low'}
                        size="small"
                        sx={{
                          bgcolor:
                            col.risk_level === 'High' ? '#fef2f2' :
                            col.risk_level === 'Medium' ? '#fffbeb' : '#f0fdf4',
                          color:
                            col.risk_level === 'High' ? '#dc2626' :
                            col.risk_level === 'Medium' ? '#d97706' : '#16a34a',
                          fontWeight: 600,
                          border: '1px solid',
                          borderColor:
                            col.risk_level === 'High' ? '#fecaca' :
                            col.risk_level === 'Medium' ? '#fde68a' : '#bbf7d0',
                        }}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                      <Collapse in={isOpen} unmountOnExit>
                        <Box sx={{ px: 6, py: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e0e0e0' }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            COLUMN METRICS — {col.column_name}
                          </Typography>
                          <ResponsiveContainer width="100%" height={100}>
                            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                              <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} width={36} />
                              <RechartsTooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                              <Bar dataKey="value" fill="#3b82f6" barSize={32} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default function Profiling() {
  const dataset = useStore((state) => state.dataset);
  const report = useStore((state) => state.profilingReport);
  const setReport = useStore((state) => state.setProfilingReport);
  const [subTab, setSubTab] = useState(0);
  const [jobId, setJobId] = useState<number | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>(report ? 'completed' : 'idle');
  const [error, setError] = useState<string | null>(null);

  const isRunning = status === 'pending' || status === 'processing' || status === 'starting';
  const wsTaskId = isRunning ? taskId : null;
  const progress = useTaskProgress(wsTaskId);

  useEffect(() => {
    if (dataset) checkExistingJob();
  }, [dataset]);

  // React to WebSocket progress events
  useEffect(() => {
    if (progress.status === 'complete' && jobId) {
      client.get(`/profiling/status/${jobId}`).then((res) => {
        if (res.data.status === 'completed' && res.data.report_data) {
          setReport(JSON.parse(res.data.report_data));
          setStatus('completed');
        }
      }).catch(console.error);
    } else if (progress.status === 'error') {
      setError(progress.message || 'Profiling failed');
      setStatus('error');
    } else if (progress.status === 'running') {
      setStatus('processing');
    }
  }, [progress.status]);

  const checkExistingJob = async () => {
    if (!dataset) return;
    try {
      const res = await client.get(`/profiling/latest/${dataset.id}`);
      if (res.data) {
        setJobId(res.data.id);
        setStatus(res.data.status);
        if (res.data.status === 'completed') {
          setReport(JSON.parse(res.data.report_data));
        }
      }
    } catch {
      // no existing job
    }
  };

  const startProfiling = async () => {
    if (!dataset) return;
    setStatus('starting');
    setError(null);
    try {
      const res = await client.post(`/profiling/start/${dataset.id}`);
      setJobId(res.data.id);
      setTaskId(res.data.task_id);
      setStatus(res.data.status);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to start profiling');
      setStatus('error');
    }
  };

  const handleDownloadReport = async (format: 'PDF' | 'HTML' | 'XLSX') => {
    if (!dataset) return;
    try {
      const response = await client.get(`/export/profiling-report/${dataset.id}`, {
        params: { format },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `profiling_report_${dataset.filename}.${format === 'PDF' ? 'pdf' : format === 'HTML' ? 'html' : 'xlsx'}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download report. Have you run profiling?');
    }
  };

  if (!dataset) {
    return <Alert severity="info" sx={{ m: 4 }}>Please load a dataset first.</Alert>;
  }

  // Before profiling is started or while in-progress
  if (status !== 'completed' || !report) {
    return (
      <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Data Profiling Engine
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Run the profiling engine to generate column-level analytics, quality scores, and match rules.
          </Typography>

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={startProfiling}
            disabled={isRunning}
            startIcon={isRunning ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
            sx={{
              mb: 3,
              py: 1.5,
              bgcolor: '#b60003',
              '&:hover': { bgcolor: '#8f0002' },
              fontSize: '1rem',
              fontWeight: 700,
            }}
          >
            {isRunning ? 'Analyzing...' : 'Run Data Profiling'}
          </Button>

          {isRunning && (
            <Box sx={{ mt: 4 }}>
              <CircularProgress size={60} />
              <Typography sx={{ mt: 2 }} variant="h6" color="text.secondary">
                {progress.message || `Profiling in progress... (${status})`}
              </Typography>
              <Stepper
                activeStep={Math.floor((progress.percent ?? 0) / 25)}
                alternativeLabel
                sx={{ mb: 2 }}
              >
                {['Loading', 'Analyzing', 'Semantic Detection', 'Saving'].map((label) => (
                  <Step key={label}>
                    <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.75rem' } }}>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
              <LinearProgress
                sx={{ mt: 2, borderRadius: 2 }}
                variant={progress.percent > 0 ? 'determinate' : 'indeterminate'}
                value={progress.percent}
              />
              {progress.percent > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {progress.percent}%
                </Typography>
              )}
            </Box>
          )}

          {status === 'error' && (
            <Box>
              <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
              <Button variant="outlined" sx={{ mt: 2 }} onClick={() => { setStatus('idle'); setError(null); }}>
                Retry
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    );
  }

  // ========== Profiling Report with Sub-Tabs ==========
  return (
    <Box sx={{ p: 4 }}>
      {/* Executive KPI Dashboard - always visible */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Rows', value: report.total_rows?.toLocaleString() || '—', color: '#1e40af' },
          { label: 'Columns', value: report.total_columns || '—', color: '#047857' },
          { label: 'Missing %', value: `${report.missing_percentage ?? 0}%`, color: '#b91c1c' },
          { label: 'Quality', value: `${report.overall_score ?? report.quality_score ?? '—'}%`, color: '#7c3aed' },
          { label: 'Fill Rate', value: `${(100 - (report.missing_percentage || 0)).toFixed(1)}%`, color: '#0369a1' },
        ].map(kpi => (
          <Grid item xs={6} sm={2.4} key={kpi.label}>
            <Card variant="outlined" sx={{ textAlign: 'center', borderTop: `3px solid ${kpi.color}` }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ color: kpi.color }}>{kpi.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Sub-Tab Navigation */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs
          value={subTab}
          onChange={(_, v) => setSubTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: '1px solid #e0e0e0' }}
        >
          <Tab icon={<DashboardIcon />} label="Overview" iconPosition="start" />
          <Tab icon={<ViewColumnIcon />} label="Column Profiles" iconPosition="start" />
          <Tab icon={<RuleIcon />} label="Match Rules" iconPosition="start" />
          <Tab icon={<FileDownloadIcon />} label="Export" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ====== Sub-Tab 0: Overview ====== */}
      {subTab === 0 && (
        <Box>
          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: '#1e40af', letterSpacing: 1 }}>
            DATA COMPLETENESS ANALYSIS
          </Typography>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Null % + Unique % grouped bar chart */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Null % vs Unique % by Column</Typography>
                <ResponsiveContainer width="100%" height={Math.max(260, (report.columns?.length ?? 0) * 26)}>
                  <BarChart
                    data={report.columns?.slice(0, 20).map((c: any) => ({
                      name: c.column_name,
                      'Null %': c.null_percentage ?? 0,
                      'Unique %': c.unique_percentage ?? 0,
                    }))}
                    layout="vertical"
                    margin={{ left: 120, right: 16, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={116} tick={{ fontSize: 11 }} />
                    <RechartsTooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                    <Legend />
                    <Bar dataKey="Null %" fill="#ef4444" barSize={9} />
                    <Bar dataKey="Unique %" fill="#3b82f6" barSize={9} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Data Type Distribution donut */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Data Type Distribution</Typography>
                {(() => {
                  const typeCounts: Record<string, number> = {};
                  report.columns?.forEach((col: any) => {
                    const t = col.dtype || 'unknown';
                    typeCounts[t] = (typeCounts[t] || 0) + 1;
                  });
                  const data = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
                  return (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={data} cx="50%" cy="50%" outerRadius={75} innerRadius={40} dataKey="value" label={({ name }) => name}>
                          {data.map((_, i) => <Cell key={i} fill={DTYPE_COLORS[i % DTYPE_COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  );
                })()}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ====== Sub-Tab 1: Column Profiles ====== */}
      {subTab === 1 && (
        <ColumnProfilesTable columns={report.columns ?? []} />
      )}

      {/* ====== Sub-Tab 2: Match Rules ====== */}
      {subTab === 2 && (
        <Box>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Match Rules</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Auto-generated matching rules based on column uniqueness, data types, and duplication patterns.
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            Match rules are auto-generated by the profiling engine.
            They recommend which columns are best for Exact, Fuzzy, or Combined duplicate matching.
          </Alert>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Rule No</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Columns</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Match Probability</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Rationale</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Confidence</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.match_rules?.length > 0 ? (
                  report.match_rules.map((rule: any, idx: number) => (
                    <TableRow key={idx} hover>
                      <TableCell>{rule.rule_no || `R${idx + 1}`}</TableCell>
                      <TableCell>
                        <Chip
                          label={rule.rule_type || 'Exact'}
                          size="small"
                          color={rule.rule_type === 'Exact' ? 'primary' : rule.rule_type === 'Fuzzy' ? 'secondary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{rule.columns}</TableCell>
                      <TableCell>{rule.match_probability}</TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>{rule.rationale}</TableCell>
                      <TableCell align="right">{rule.confidence ?? '—'}%</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.disabled">
                        No match rules generated yet. Re-run profiling to generate.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ====== Sub-Tab 3: Export ====== */}
      {subTab === 3 && (
        <Box>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Export Profiling Report</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Download the profiling results in professional formats.
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 3 }}>
                <AssessmentIcon sx={{ fontSize: 40, color: '#0f172a', mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={600}>Excel Summary</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  All metrics in a single workbook
                </Typography>
                <Button variant="contained" color="success" onClick={() => handleDownloadReport('XLSX')}>
                  Download .xlsx
                </Button>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 3 }}>
                <FileDownloadIcon sx={{ fontSize: 40, color: '#1976d2', mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={600}>HTML Report</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Interactive profiling report
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={() => handleDownloadReport('HTML')}
                >
                  Download .html
                </Button>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 3 }}>
                <FileDownloadIcon sx={{ fontSize: 40, color: '#b91c1c', mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={600}>PDF Report</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Formatted profiling summary
                </Typography>
                <Button 
                  variant="contained" 
                  color="error" 
                  onClick={() => handleDownloadReport('PDF')}
                >
                  Download .pdf
                </Button>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
