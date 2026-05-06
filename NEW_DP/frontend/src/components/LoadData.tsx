import { useState, useEffect } from 'react';
import {
  Box, Button, Typography, CircularProgress, Paper, Tabs, Tab,
  TextField, Select, MenuItem, FormControl, InputLabel, Alert,
  Grid, Card, CardContent, Chip, Accordion, AccordionSummary, AccordionDetails,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Storage as StorageIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import client from '../api/client';
import { useStore } from '../store';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

interface LoadDataProps {
  onNext: () => void;
}

export default function LoadData({ onNext }: LoadDataProps) {
  const [subTab, setSubTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setDataset = useStore((state) => state.setDataset);
  const dataset = useStore((state) => state.dataset);

  // DB Connector state
  const [dbEngine, setDbEngine] = useState('PostgreSQL');
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('5432');
  const [dbName, setDbName] = useState('');
  const [dbUser, setDbUser] = useState('');
  const [dbPass, setDbPass] = useState('');
  const [tableName, setTableName] = useState('');
  const [testResult, setTestResult] = useState<{success: boolean, error?: string} | null>(null);

  const handleTestConnection = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await client.post('/data/test-connection', {
        engine: dbEngine,
        host: dbHost,
        port: dbPort,
        database: dbName,
        username: dbUser,
        password: dbPass
      });
      setTestResult(res.data);
    } catch (err) {
      setTestResult({ success: false, error: "Network error or invalid parameters" });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTable = async () => {
    if (!tableName) {
      setError("Please specify a table name");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await client.post('/data/load-db', {
        engine: dbEngine,
        host: dbHost,
        port: dbPort,
        database: dbName,
        username: dbUser,
        password: dbPass,
        table_name: tableName,
        project_id: selectedProjectId || undefined
      });
      setDataset(res.data);
      onNext();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load table from database");
    } finally {
      setLoading(false);
    }
  };

  // Project state
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | string>('');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await client.get('/projects/');
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName) return;
    try {
      const res = await client.post('/projects/', { name: newProjectName });
      const newProj = res.data;
      setProjects([...projects, newProj]);
      setSelectedProjectId(newProj.id);
      setNewProjectName('');
      setShowCreateProject(false);
    } catch (err) {
      alert('Failed to create project');
    }
  };

  // Preview-before-upload state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ is_excel: boolean; sheets: string[]; columns: string[]; preview_rows: any[] } | null>(null);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [headerRow, setHeaderRow] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPreview(null);
    setError(null);
    setPreviewing(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await client.post('/data/preview-file', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPreview(res.data);
      setSelectedSheet(res.data.sheets?.[0] ?? '');
      setHeaderRow(0);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not preview file');
      setPendingFile(null);
    } finally {
      setPreviewing(false);
    }
    // Reset input so the same file can be re-selected
    event.target.value = '';
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;
    setLoading(true);
    setUploadProgress(0);
    setError(null);
    const formData = new FormData();
    formData.append('file', pendingFile);
    const params: Record<string, any> = {};
    if (selectedProjectId) params.project_id = selectedProjectId;
    if (preview?.is_excel && selectedSheet) params.sheet_name = selectedSheet;
    if (!preview?.is_excel && headerRow > 0) params.header = headerRow;
    try {
      const res = await client.post('/data/upload', formData, {
        params,
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setDataset(res.data);
      setPreview(null);
      setPendingFile(null);
      setUploadProgress(0);
      onNext();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to upload dataset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
      {/* Sub-tab navigation */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs
          value={subTab}
          onChange={(_, v) => setSubTab(v)}
          variant="fullWidth"
          sx={{ borderBottom: '1px solid #e0e0e0' }}
        >
          <Tab icon={<CloudUploadIcon />} label="File Upload" iconPosition="start" />
          <Tab icon={<StorageIcon />} label="Database Connector" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ========== SUB-TAB 0: File Upload ========== */}
      {subTab === 0 && (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Load Dataset
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload a CSV, Excel, JSON, Parquet, or Feather file (up to 1 GB).
          </Typography>

          {/* Supported formats chips */}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 4, flexWrap: 'wrap' }}>
            {['CSV', 'TSV', 'TXT', 'XLSX', 'XLS', 'JSON', 'JSONL', 'Parquet', 'Feather'].map(f => (
              <Chip key={f} label={f} size="small" variant="outlined" />
            ))}
          </Box>

          <Box sx={{ maxWidth: 400, mx: 'auto', mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, justifyContent: 'space-between' }}>
              <Typography variant="subtitle2" fontWeight="bold">Project Organization</Typography>
              <Button size="small" startIcon={<CreateNewFolderIcon />} onClick={() => setShowCreateProject(!showCreateProject)}>
                New
              </Button>
            </Box>
            
            {showCreateProject && (
              <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                <TextField 
                  size="small" fullWidth label="Project Name" 
                  value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} 
                />
                <Button variant="contained" size="small" onClick={handleCreateProject}>Create</Button>
              </Box>
            )}

            <FormControl fullWidth size="small">
              <InputLabel>Select Project (Optional)</InputLabel>
              <Select 
                value={selectedProjectId} 
                label="Select Project (Optional)"
                onChange={(e) => setSelectedProjectId(e.target.value)}
                startAdornment={<FolderSpecialIcon sx={{ mr: 1, color: '#6366f1' }} />}
              >
                <MenuItem value=""><em>None / Default</em></MenuItem>
                {projects.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          {dataset ? (
            <Box>
              <Alert severity="success" sx={{ mb: 3, justifyContent: 'center' }}>
                <strong>{dataset.filename}</strong> loaded successfully
              </Alert>

              {/* Post-upload summary card */}
              <Paper
                variant="outlined"
                sx={{ p: 3, mt: 1, mb: 3, borderColor: '#b60003', borderRadius: 2 }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>{dataset.filename}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {dataset.row_count?.toLocaleString() ?? '—'} rows
                      {dataset.col_count ? ` · ${dataset.col_count} columns` : ''}
                      {dataset.file_size_bytes
                        ? ` · ${(dataset.file_size_bytes / 1024 / 1024).toFixed(1)} MB`
                        : ''}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    onClick={onNext}
                    sx={{ bgcolor: '#b60003', '&:hover': { bgcolor: '#8f0002' }, flexShrink: 0 }}
                  >
                    Continue to Profiling
                  </Button>
                </Box>
              </Paper>

              {/* Data status metrics */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="caption" color="text.secondary">Rows</Typography>
                      <Typography variant="h5" fontWeight="bold">{dataset.row_count?.toLocaleString() || '—'}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="caption" color="text.secondary">Columns</Typography>
                      <Typography variant="h5" fontWeight="bold">{dataset.col_count || '—'}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="caption" color="text.secondary">Status</Typography>
                      <Typography variant="h5" fontWeight="bold" color="success.main">Ready</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="caption" color="text.secondary">Format</Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {dataset.filename?.split('.').pop()?.toUpperCase() || '—'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Column summary - collapsible */}
              <Accordion sx={{ mb: 3 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography fontWeight={600}>Column Summary</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary">
                    Columns in this dataset: {dataset.columns?.join(', ') || 'N/A'}
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button variant="contained" onClick={onNext} startIcon={<CheckCircleIcon />}>
                  Proceed to Next Tab
                </Button>
                <Button variant="outlined" component="label">
                  Load Different File
                  <VisuallyHiddenInput type="file" onChange={handleFileSelect} accept=".csv,.xlsx,.xls,.parquet,.json,.jsonl,.feather,.tsv,.txt" />
                </Button>
              </Box>
            </Box>
          ) : preview ? (
            /* ── Preview Panel ── */
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Configure &amp; Confirm — <em>{pendingFile?.name}</em>
              </Typography>

              {/* Excel sheet selector */}
              {preview.is_excel && preview.sheets.length > 1 && (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Sheet</InputLabel>
                  <Select value={selectedSheet} label="Sheet" onChange={(e) => setSelectedSheet(e.target.value)}>
                    {preview.sheets.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              )}

              {/* Header row selector for flat files */}
              {!preview.is_excel && (
                <TextField
                  fullWidth
                  type="number"
                  label="Header Row (0 = first row)"
                  value={headerRow}
                  onChange={(e) => setHeaderRow(Number(e.target.value))}
                  slotProps={{ input: { inputProps: { min: 0, max: 10 } } }}
                  sx={{ mb: 2 }}
                  size="small"
                />
              )}

              <Divider sx={{ my: 2 }} />

              {/* Column preview table */}
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Column Preview ({preview.columns.length} columns, first {preview.preview_rows.length} rows)
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, maxHeight: 260, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {preview.columns.map(col => (
                        <TableCell key={col} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{col}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.preview_rows.map((row, i) => (
                      <TableRow key={i}>
                        {preview.columns.map(col => (
                          <TableCell key={col} sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                            {String(row[col] ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {loading && uploadProgress > 0 && uploadProgress < 100 && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">Uploading…</Typography>
                    <Typography variant="caption" color="text.secondary">{uploadProgress}%</Typography>
                  </Box>
                  <Box sx={{ width: '100%', bgcolor: '#e0e0e0', borderRadius: 2, height: 6 }}>
                    <Box sx={{ width: `${uploadProgress}%`, bgcolor: 'primary.main', borderRadius: 2, height: 6, transition: 'width 0.3s' }} />
                  </Box>
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
                  onClick={handleConfirmUpload}
                  disabled={loading}
                >
                  {loading ? (uploadProgress > 0 ? `Uploading ${uploadProgress}%` : 'Processing…') : 'Confirm & Upload'}
                </Button>
                <Button variant="outlined" onClick={() => { setPreview(null); setPendingFile(null); }} disabled={loading}>
                  Cancel
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Paper
                variant="outlined"
                sx={{
                  border: '2px dashed rgba(182,0,3,0.4)',
                  borderRadius: 3,
                  minHeight: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 4,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, background-color 0.2s',
                  width: '100%',
                  maxWidth: 600,
                  mb: 3,
                  '&:hover': {
                    borderColor: '#b60003',
                    bgcolor: '#fef2f2',
                  },
                }}
                component="label"
              >
                {previewing ? (
                  <CircularProgress size={48} />
                ) : (
                  <>
                    <CloudUploadIcon sx={{ fontSize: 48, color: '#b60003', mb: 2 }} />
                    <Typography variant="h6" color="primary">
                      Click to upload or drag file here
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Supports CSV, Excel, JSON, Parquet, Feather
                    </Typography>
                  </>
                )}
                <VisuallyHiddenInput type="file" onChange={handleFileSelect} accept=".csv,.xlsx,.xls,.parquet,.json,.jsonl,.feather,.tsv,.txt" />
              </Paper>
            </Box>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
          )}
        </Paper>
      )}

      {/* ========== SUB-TAB 1: Database Connector ========== */}
      {subTab === 1 && (
        <Paper elevation={2} sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Connect to Database
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Load data directly from a database using connection parameters.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Database Engine</InputLabel>
                <Select value={dbEngine} label="Database Engine" onChange={(e) => setDbEngine(e.target.value)}>
                  {['PostgreSQL', 'MySQL', 'SQL Server', 'Oracle', 'Snowflake', 'BigQuery'].map(eng => (
                    <MenuItem key={eng} value={eng}>{eng}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Host / Account" value={dbHost} onChange={(e) => setDbHost(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Port" value={dbPort} onChange={(e) => setDbPort(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Database / Project" value={dbName} onChange={(e) => setDbName(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Table Name" value={tableName} onChange={(e) => setTableName(e.target.value)} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Username" value={dbUser} onChange={(e) => setDbUser(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Password" type="password" value={dbPass} onChange={(e) => setDbPass(e.target.value)} />
            </Grid>
          </Grid>

          {testResult && (
            <Alert severity={testResult.success ? "success" : "error"} sx={{ mt: 3 }}>
              {testResult.success ? "Connection successful!" : `Connection failed: ${testResult.error}`}
            </Alert>
          )}

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button 
              variant="contained" 
              onClick={handleTestConnection} 
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} />}
            >
              Test Connection
            </Button>
            <Button 
              variant="outlined" 
              onClick={handleLoadTable} 
              disabled={loading || !testResult?.success}
              startIcon={loading && <CircularProgress size={20} />}
            >
              Load Table
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
