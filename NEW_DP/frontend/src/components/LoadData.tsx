// frontend/src/components/LoadData.tsx — full-screen split-panel redesign
import { useState, useEffect } from 'react';
import {
  Box, Button, Typography, CircularProgress, TextField, Select,
  MenuItem, FormControl, InputLabel, Alert, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Divider, Tabs, Tab, Tooltip,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Storage as StorageIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  FolderSpecial as FolderSpecialIcon,
  CreateNewFolder as CreateNewFolderIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import client from '../api/client';
import { useStore } from '../store';

/* ─── Invisible file input ─── */
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

const FORMATS = ['CSV', 'TSV', 'TXT', 'XLSX', 'XLS', 'JSON', 'JSONL', 'Parquet', 'Feather'];
const DB_ENGINES = ['PostgreSQL', 'MySQL', 'SQL Server', 'Oracle', 'Snowflake', 'BigQuery'];
const ACCEPT = '.csv,.xlsx,.xls,.parquet,.json,.jsonl,.feather,.tsv,.txt';

interface LoadDataProps { onNext: () => void; }

export default function LoadData({ onNext }: LoadDataProps) {
  /* ── tab ── */
  const [subTab, setSubTab] = useState(0);

  /* ── global state ── */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setDataset = useStore((s) => s.setDataset);
  const dataset   = useStore((s) => s.dataset);

  /* ── project ── */
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | string>('');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => { loadProjects(); }, []);
  const loadProjects = async () => {
    try { const r = await client.get('/projects/'); setProjects(r.data); }
    catch { /* silent */ }
  };
  const handleCreateProject = async () => {
    if (!newProjectName) return;
    try {
      const r = await client.post('/projects/', { name: newProjectName });
      setProjects(prev => [...prev, r.data]);
      setSelectedProjectId(r.data.id);
      setNewProjectName('');
      setShowCreateProject(false);
    } catch { alert('Failed to create project'); }
  };

  /* ── file upload / preview ── */
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    is_excel: boolean; sheets: string[]; columns: string[]; preview_rows: any[];
  } | null>(null);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [headerRow, setHeaderRow] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (file: File) => {
    setPendingFile(file);
    setPreview(null);
    setError(null);
    setPreviewing(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await client.post('/data/preview-file', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPreview(r.data);
      setSelectedSheet(r.data.sheets?.[0] ?? '');
      setHeaderRow(0);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not preview file');
      setPendingFile(null);
    } finally {
      setPreviewing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;
    setLoading(true);
    setUploadProgress(0);
    setError(null);
    const fd = new FormData();
    fd.append('file', pendingFile);
    const params: Record<string, any> = {};
    if (selectedProjectId) params.project_id = selectedProjectId;
    if (preview?.is_excel && selectedSheet) params.sheet_name = selectedSheet;
    if (!preview?.is_excel && headerRow > 0) params.header = headerRow;
    try {
      const r = await client.post('/data/upload', fd, {
        params,
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setDataset(r.data);
      setPreview(null);
      setPendingFile(null);
      setUploadProgress(0);
      onNext();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  /* ── DB connector ── */
  const [dbEngine, setDbEngine] = useState('PostgreSQL');
  const [dbHost, setDbHost]     = useState('localhost');
  const [dbPort, setDbPort]     = useState('5432');
  const [dbName, setDbName]     = useState('');
  const [dbUser, setDbUser]     = useState('');
  const [dbPass, setDbPass]     = useState('');
  const [tableName, setTableName] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleTestConnection = async () => {
    setLoading(true); setTestResult(null);
    try {
      const r = await client.post('/data/test-connection', { engine: dbEngine, host: dbHost, port: dbPort, database: dbName, username: dbUser, password: dbPass });
      setTestResult(r.data);
    } catch { setTestResult({ success: false, error: 'Network error or invalid parameters' }); }
    finally { setLoading(false); }
  };

  const handleLoadTable = async () => {
    if (!tableName) { setError('Please specify a table name'); return; }
    setLoading(true); setError(null);
    try {
      const r = await client.post('/data/load-db', { engine: dbEngine, host: dbHost, port: dbPort, database: dbName, username: dbUser, password: dbPass, table_name: tableName, project_id: selectedProjectId || undefined });
      setDataset(r.data);
      onNext();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load table');
    } finally { setLoading(false); }
  };

  /* ─────────────────────────── RENDER ─────────────────────────── */
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>

      {/* ── Source-type tab strip ── */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0, bgcolor: 'background.paper' }}>
        <Tabs
          value={subTab}
          onChange={(_, v) => { setSubTab(v); setError(null); }}
          sx={{ px: 2, minHeight: 44, '& .MuiTab-root': { minHeight: 44, py: 0 } }}
        >
          <Tab icon={<CloudUploadIcon sx={{ fontSize: 17 }} />} label="File Upload" iconPosition="start" />
          <Tab icon={<StorageIcon sx={{ fontSize: 17 }} />} label="Database Connector" iconPosition="start" />
        </Tabs>
      </Box>

      {/* ════════════════ FILE UPLOAD ════════════════ */}
      {subTab === 0 && (
        <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>

          {/* ── State: file loaded ── */}
          {dataset ? (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

              {/* Pinned top bar */}
              <Box sx={{
                px: 3, py: 1.5,
                borderBottom: '1px solid', borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex', alignItems: 'center', gap: 2,
                flexShrink: 0, flexWrap: 'wrap',
              }}>
                <CheckCircleIcon sx={{ color: 'success.main', fontSize: 18, flexShrink: 0 }} />
                <Typography fontWeight={700} noWrap sx={{ mr: 1 }}>{dataset.filename}</Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {[
                    `${dataset.row_count?.toLocaleString() ?? '—'} rows`,
                    `${dataset.col_count ?? '—'} columns`,
                    dataset.file_size_bytes ? `${(dataset.file_size_bytes / 1024 / 1024).toFixed(1)} MB` : null,
                    dataset.filename?.split('.').pop()?.toUpperCase() ?? null,
                  ].filter(Boolean).map((label) => (
                    <Chip
                      key={label as string}
                      label={label}
                      size="small"
                      sx={{ height: 22, fontSize: '0.7rem', bgcolor: 'action.hover' }}
                    />
                  ))}
                </Box>

                <Box sx={{ flex: 1 }} />

                <Button
                  size="small"
                  variant="outlined"
                  component="label"
                  sx={{ flexShrink: 0 }}
                >
                  Load Different File
                  <VisuallyHiddenInput type="file" onChange={handleInputChange} accept={ACCEPT} />
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  onClick={onNext}
                  sx={{ bgcolor: '#b60003', '&:hover': { bgcolor: '#8f0002' }, flexShrink: 0 }}
                >
                  Continue to Profiling
                </Button>
              </Box>

              {/* Stats row */}
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                borderBottom: '1px solid',
                borderColor: 'divider',
                flexShrink: 0,
              }}>
                {[
                  { label: 'ROWS',    value: dataset.row_count?.toLocaleString() ?? '—' },
                  { label: 'COLUMNS', value: dataset.col_count ?? '—' },
                  { label: 'STATUS',  value: 'Ready', color: 'success.main' },
                  { label: 'FORMAT',  value: dataset.filename?.split('.').pop()?.toUpperCase() ?? '—' },
                ].map((s, i) => (
                  <Box
                    key={s.label}
                    sx={{
                      px: 3, py: 2.5,
                      borderRight: i < 3 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: '0.06em' }}>
                      {s.label}
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color={s.color ?? 'text.primary'} sx={{ mt: 0.5, lineHeight: 1 }}>
                      {s.value}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Columns explorer */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: '0.06em', display: 'block', mb: 1.5 }}>
                  COLUMNS ({dataset.columns?.length ?? 0})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {dataset.columns?.map((col: string) => (
                    <Chip
                      key={col}
                      label={col}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.75rem', height: 26 }}
                    />
                  ))}
                  {!dataset.columns?.length && (
                    <Typography variant="body2" color="text.secondary">No column information available.</Typography>
                  )}
                </Box>
              </Box>

              {/* Bottom action row */}
              <Box sx={{
                px: 3, py: 2,
                borderTop: '1px solid', borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex', gap: 2, flexShrink: 0,
              }}>
                <Button variant="contained" startIcon={<CheckCircleIcon />} onClick={onNext}>
                  Proceed to Next Tab
                </Button>
                <Button variant="outlined" component="label">
                  Load Different File
                  <VisuallyHiddenInput type="file" onChange={handleInputChange} accept={ACCEPT} />
                </Button>
              </Box>
            </Box>

          ) : preview ? (
            /* ── State: preview (configure before upload) ── */
            <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>

              {/* Left: config panel */}
              <Box sx={{
                width: 240,
                flexShrink: 0,
                borderRight: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'auto',
              }}>
                {/* Header */}
                <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: '0.06em' }}>
                    CONFIGURE IMPORT
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5, wordBreak: 'break-all', lineHeight: 1.3 }}>
                    {pendingFile?.name}
                  </Typography>
                </Box>

                <Box sx={{ p: 2.5, flex: 1 }}>
                  {preview.is_excel && preview.sheets.length > 1 && (
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                      <InputLabel>Sheet</InputLabel>
                      <Select value={selectedSheet} label="Sheet" onChange={(e) => setSelectedSheet(e.target.value)}>
                        {preview.sheets.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                      </Select>
                    </FormControl>
                  )}

                  {!preview.is_excel && (
                    <TextField
                      fullWidth size="small"
                      type="number"
                      label="Header Row (0 = first)"
                      value={headerRow}
                      onChange={(e) => setHeaderRow(Number(e.target.value))}
                      slotProps={{ input: { inputProps: { min: 0, max: 10 } } }}
                      sx={{ mb: 2 }}
                    />
                  )}

                  <Box sx={{
                    p: 1.5,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    mb: 2,
                  }}>
                    <Typography variant="caption" color="text.secondary">
                      {preview.columns.length} columns detected
                    </Typography>
                  </Box>

                  {loading && uploadProgress > 0 && uploadProgress < 100 && (
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">Uploading</Typography>
                        <Typography variant="caption" color="text.secondary">{uploadProgress}%</Typography>
                      </Box>
                      <Box sx={{ height: 4, bgcolor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                        <Box sx={{
                          height: 4, bgcolor: '#b60003', borderRadius: 2,
                          width: `${uploadProgress}%`,
                          transition: 'width 0.3s ease',
                        }} />
                      </Box>
                    </Box>
                  )}
                </Box>

                {/* Action buttons pinned to bottom */}
                <Box sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                    onClick={handleConfirmUpload}
                    disabled={loading}
                    sx={{ bgcolor: '#b60003', '&:hover': { bgcolor: '#8f0002' } }}
                  >
                    {loading
                      ? uploadProgress > 0 ? `Uploading ${uploadProgress}%` : 'Processing…'
                      : 'Confirm & Upload'}
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => { setPreview(null); setPendingFile(null); }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>

              {/* Right: full-width scrollable preview table */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                <Box sx={{
                  px: 3, py: 1.5,
                  borderBottom: '1px solid', borderColor: 'divider',
                  bgcolor: 'background.paper',
                  flexShrink: 0,
                }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: '0.06em' }}>
                    DATA PREVIEW — first {preview.preview_rows.length} rows · {preview.columns.length} columns
                  </Typography>
                </Box>
                <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {preview.columns.map(col => (
                          <TableCell key={col} sx={{ fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                            {col}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.preview_rows.map((row, i) => (
                        <TableRow key={i} hover>
                          {preview.columns.map(col => (
                            <TableCell key={col} sx={{ whiteSpace: 'nowrap', fontSize: '0.73rem', color: 'text.secondary' }}>
                              {String(row[col] ?? '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>

          ) : (
            /* ── State: empty (no file yet) ── */
            <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>

              {/* Left sidebar */}
              <Box sx={{
                width: 240,
                flexShrink: 0,
                borderRight: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'auto',
              }}>
                {/* Project org */}
                <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: '0.06em' }}>
                      PROJECT
                    </Typography>
                    <Tooltip title="Create new project">
                      <Button
                        size="small"
                        startIcon={<CreateNewFolderIcon sx={{ fontSize: '14px !important' }} />}
                        onClick={() => setShowCreateProject(v => !v)}
                        sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: '0.7rem', lineHeight: 1 }}
                      >
                        New
                      </Button>
                    </Tooltip>
                  </Box>

                  {showCreateProject && (
                    <Box sx={{ mb: 1.5, display: 'flex', gap: 0.75 }}>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Project name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                        autoFocus
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleCreateProject}
                        sx={{ flexShrink: 0, bgcolor: '#b60003', '&:hover': { bgcolor: '#8f0002' }, px: 1.5 }}
                      >
                        +
                      </Button>
                    </Box>
                  )}

                  <FormControl fullWidth size="small">
                    <InputLabel>Select Project</InputLabel>
                    <Select
                      value={selectedProjectId}
                      label="Select Project"
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      startAdornment={<FolderSpecialIcon sx={{ mr: 1, color: '#6366f1', fontSize: 16 }} />}
                    >
                      <MenuItem value=""><em>None / Default</em></MenuItem>
                      {projects.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>

                <Divider />

                {/* Format list */}
                <Box sx={{ px: 2.5, py: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: '0.06em', display: 'block', mb: 1 }}>
                    SUPPORTED FORMATS
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {FORMATS.map(f => (
                      <Chip key={f} label={f} size="small" variant="outlined"
                        sx={{ fontSize: '0.65rem', height: 20, borderRadius: '4px' }} />
                    ))}
                  </Box>
                </Box>

                <Divider />

                {/* Limits */}
                <Box sx={{ px: 2.5, py: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: '0.06em', display: 'block', mb: 0.75 }}>
                    LIMITS
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <InfoIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.secondary">Max file size: 1 GB</Typography>
                  </Box>
                </Box>
              </Box>

              {/* Right: full-height drop zone */}
              <Box
                sx={{ flex: 1, p: 3, display: 'flex', alignItems: 'stretch' }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <Box
                  component="label"
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px dashed',
                    borderColor: dragOver ? '#b60003' : 'rgba(182,0,3,0.25)',
                    borderRadius: 3,
                    cursor: 'pointer',
                    bgcolor: dragOver ? 'rgba(182,0,3,0.03)' : 'transparent',
                    transition: 'border-color 0.2s, background-color 0.2s',
                    '&:hover': {
                      borderColor: '#b60003',
                      bgcolor: 'rgba(182,0,3,0.025)',
                    },
                    userSelect: 'none',
                  }}
                >
                  {previewing ? (
                    <>
                      <CircularProgress size={52} sx={{ color: '#b60003', mb: 2.5 }} />
                      <Typography variant="h6" color="text.secondary">Analysing file…</Typography>
                    </>
                  ) : (
                    <>
                      <CloudUploadIcon
                        sx={{
                          fontSize: 72,
                          color: dragOver ? '#b60003' : 'rgba(182,0,3,0.45)',
                          mb: 3,
                          transition: 'color 0.2s',
                        }}
                      />
                      <Typography variant="h5" fontWeight={700} gutterBottom>
                        {dragOver ? 'Drop to upload' : 'Drop your file here'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        or <Box component="span" sx={{ color: '#b60003', fontWeight: 600 }}>click to browse</Box>
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 2 }}>
                        CSV · TSV · XLSX · XLS · JSON · JSONL · Parquet · Feather — up to 1 GB
                      </Typography>
                    </>
                  )}
                  <VisuallyHiddenInput type="file" onChange={handleInputChange} accept={ACCEPT} />
                </Box>
              </Box>
            </Box>
          )}

          {/* Error banner */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2, flexShrink: 0 }}>
              {error}
            </Alert>
          )}
        </Box>
      )}

      {/* ════════════════ DATABASE CONNECTOR ════════════════ */}
      {subTab === 1 && (
        <Box sx={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'auto' }}>

          {/* Left: engine + info sidebar */}
          <Box sx={{
            width: 240,
            flexShrink: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: '0.06em', display: 'block', mb: 1.5 }}>
                DATABASE ENGINE
              </Typography>
              <FormControl fullWidth size="small">
                <Select value={dbEngine} onChange={(e) => setDbEngine(e.target.value)}>
                  {DB_ENGINES.map(eng => (
                    <MenuItem key={eng} value={eng}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <StorageIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                        {eng}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Divider />

            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: '0.06em', display: 'block', mb: 1 }}>
                PROJECT
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Assign to Project</InputLabel>
                <Select
                  value={selectedProjectId}
                  label="Assign to Project"
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {projects.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>

            <Divider />

            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: '0.06em', display: 'block', mb: 0.75 }}>
                STATUS
              </Typography>
              {testResult ? (
                <Box sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: testResult.success ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
                  border: '1px solid',
                  borderColor: testResult.success ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)',
                }}>
                  <Typography variant="caption" color={testResult.success ? 'success.main' : 'error.main'} fontWeight={600}>
                    {testResult.success ? '● Connected' : '● Failed'}
                  </Typography>
                  {!testResult.success && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {testResult.error}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Typography variant="caption" color="text.disabled">Not tested yet</Typography>
              )}
            </Box>
          </Box>

          {/* Right: connection form */}
          <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: '0.06em', display: 'block', mb: 2.5 }}>
              CONNECTION PARAMETERS
            </Typography>

            {/* Connection fields grid */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 140px',
              gap: 2,
              mb: 2,
            }}>
              <TextField
                label="Host / Account"
                size="small"
                fullWidth
                value={dbHost}
                onChange={(e) => setDbHost(e.target.value)}
                placeholder="e.g. localhost or account.snowflakecomputing.com"
              />
              <TextField
                label="Database / Schema"
                size="small"
                fullWidth
                value={dbName}
                onChange={(e) => setDbName(e.target.value)}
              />
              <TextField
                label="Port"
                size="small"
                fullWidth
                value={dbPort}
                onChange={(e) => setDbPort(e.target.value)}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 3 }}>
              <TextField
                label="Username"
                size="small"
                fullWidth
                value={dbUser}
                onChange={(e) => setDbUser(e.target.value)}
              />
              <TextField
                label="Password"
                size="small"
                type="password"
                fullWidth
                value={dbPass}
                onChange={(e) => setDbPass(e.target.value)}
              />
              <TextField
                label="Table Name"
                size="small"
                fullWidth
                required
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="schema.table"
              />
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="outlined"
                onClick={handleTestConnection}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : undefined}
              >
                Test Connection
              </Button>
              <Button
                variant="contained"
                onClick={handleLoadTable}
                disabled={loading || !testResult?.success}
                endIcon={<ArrowForwardIcon />}
                sx={{ bgcolor: '#b60003', '&:hover': { bgcolor: '#8f0002' } }}
              >
                Load Table
              </Button>
              {loading && <CircularProgress size={20} sx={{ color: '#b60003' }} />}
            </Box>

            {error && (
              <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
