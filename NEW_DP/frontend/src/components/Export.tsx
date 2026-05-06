import { useState } from 'react';
import {
  Box, Typography, Paper, Alert, Grid, Card, Tabs, Tab,
  FormControl, InputLabel, Select, MenuItem, Chip, TextField,
  Button, Checkbox, FormControlLabel, Accordion, AccordionSummary, AccordionDetails,
  CircularProgress
} from '@mui/material';
import {
  FileDownload as DownloadIcon,
  Description as DataIcon,
  Assessment as ReportIcon,
  FolderZip as BatchIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useStore } from '../store';
import client from '../api/client';

const FORMAT_OPTIONS = [
  { value: 'CSV', label: 'CSV', icon: '📄', desc: 'Comma-separated' },
  { value: 'Excel', label: 'Excel', icon: '📊', desc: 'Excel workbook' },
  { value: 'Parquet', label: 'Parquet', icon: '🗜️', desc: 'Columnar format' },
  { value: 'JSON', label: 'JSON', icon: '{ }', desc: 'JSON records' },
  { value: 'Feather', label: 'Feather', icon: '🪶', desc: 'Fast binary' },
];

export default function Export() {
  const currentDataset = useStore((state) => state.dataset);
  const [subTab, setSubTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Export config state
  const [exportFormat, setExportFormat] = useState('CSV');
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [samplePct, setSamplePct] = useState(100);
  const [includeIndex, setIncludeIndex] = useState(false);
  const [encoding, setEncoding] = useState('utf-8');
  const [compression, setCompression] = useState('none');
  const [delimiter, setDelimiter] = useState(',');

  // Batch config
  const [rowsPerFile, setRowsPerFile] = useState(100000);

  if (!currentDataset) {
    return <Alert severity="info" sx={{ m: 4 }}>No data to export.</Alert>;
  }

  const allColumns = currentDataset.columns || [];
  const totalRows = currentDataset.row_count || 0;

  const handleExport = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await client.get(`/export/${currentDataset.id}`, {
        params: {
          format: exportFormat,
          columns_csv: selectedCols.length ? selectedCols.join(',') : undefined,
          sample_pct: samplePct,
          include_index: includeIndex,
          encoding,
          compression,
          delimiter,
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const extensions: Record<string, string> = {
        'CSV': 'csv',
        'Excel': 'xlsx',
        'Parquet': 'parquet',
        'JSON': 'json',
        'Feather': 'feather'
      };
      
      link.setAttribute('download', `${currentDataset.filename}_export.${extensions[exportFormat] || 'file'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (format: 'PDF' | 'HTML' | 'XLSX') => {
    try {
      setLoading(true);
      setError('');
      const response = await client.get(`/export/profiling-report/${currentDataset.id}`, {
        params: { format },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `profiling_report_${currentDataset.filename}.${format === 'PDF' ? 'pdf' : format === 'HTML' ? 'html' : 'xlsx'}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Report generation failed. Have you run profiling yet?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>Export Data</Typography>

      {/* Sub-Tab Navigation */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs
          value={subTab}
          onChange={(_, v) => { setSubTab(v); setError(''); }}
          variant="fullWidth"
          sx={{ borderBottom: '1px solid #e0e0e0' }}
        >
          <Tab icon={<DataIcon />} label="Data Export" iconPosition="start" />
          <Tab icon={<ReportIcon />} label="Profiling Report" iconPosition="start" />
          <Tab icon={<BatchIcon />} label="Batch Export" iconPosition="start" />
        </Tabs>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* ====== Sub-Tab 0: Data Export ====== */}
      {subTab === 0 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>Export Configuration</Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Export Format</Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {FORMAT_OPTIONS.map((fmt) => (
                <Box
                  key={fmt.value}
                  onClick={() => setExportFormat(fmt.value)}
                  sx={{
                    width: 100,
                    p: 1.5,
                    borderRadius: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: exportFormat === fmt.value ? '#b60003' : 'divider',
                    bgcolor: exportFormat === fmt.value ? '#fef2f2' : 'background.paper',
                    transition: 'all 0.15s',
                    '&:hover': { borderColor: '#b60003' },
                  }}
                >
                  <Typography sx={{ fontSize: '1.5rem', mb: 0.25, lineHeight: 1.2 }}>{fmt.icon}</Typography>
                  <Typography variant="body2" fontWeight={700}>{fmt.label}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{fmt.desc}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Columns (empty = all)</InputLabel>
                <Select
                  multiple
                  value={selectedCols}
                  label="Columns (empty = all)"
                  onChange={(e) => setSelectedCols(e.target.value as string[])}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.slice(0, 3).map((v) => <Chip key={v} label={v} size="small" />)}
                      {selected.length > 3 && <Chip label={`+${selected.length - 3}`} size="small" />}
                    </Box>
                  )}
                >
                  {allColumns.map((col: string) => (
                    <MenuItem key={col} value={col}>{col}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              {totalRows > 100000 && (
                <Box>
                  <Typography variant="body2" color="warning.main" gutterBottom>
                    Large dataset: {totalRows.toLocaleString()} rows
                  </Typography>
                  <TextField
                    fullWidth type="number" label="Sample %"
                    value={samplePct}
                    onChange={(e) => setSamplePct(parseInt(e.target.value) || 100)}
                    inputProps={{ min: 1, max: 100 }}
                  />
                </Box>
              )}
            </Grid>
          </Grid>

          {/* Advanced Options */}
          <Accordion sx={{ mb: 3 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600}>Advanced Options</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={<Checkbox checked={includeIndex} onChange={(e) => setIncludeIndex(e.target.checked)} />}
                    label="Include Index"
                  />
                  <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                    <InputLabel>Encoding</InputLabel>
                    <Select value={encoding} label="Encoding" onChange={(e) => setEncoding(e.target.value)}>
                      <MenuItem value="utf-8">UTF-8</MenuItem>
                      <MenuItem value="latin-1">Latin-1</MenuItem>
                      <MenuItem value="utf-16">UTF-16</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Compression</InputLabel>
                    <Select value={compression} label="Compression" onChange={(e) => setCompression(e.target.value)}>
                      <MenuItem value="none">None</MenuItem>
                      <MenuItem value="gzip">Gzip</MenuItem>
                      <MenuItem value="zip">Zip</MenuItem>
                      <MenuItem value="bz2">BZ2</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {exportFormat === 'CSV' && (
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Delimiter</InputLabel>
                      <Select value={delimiter} label="Delimiter" onChange={(e) => setDelimiter(e.target.value)}>
                        <MenuItem value=",">Comma (,)</MenuItem>
                        <MenuItem value=";">Semicolon (;)</MenuItem>
                        <MenuItem value="\t">Tab</MenuItem>
                        <MenuItem value="|">Pipe (|)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>Export Summary:</strong> {totalRows.toLocaleString()} rows × {(selectedCols.length || allColumns.length)} columns
          </Typography>

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleExport}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
            sx={{
              mt: 3,
              py: 1.5,
              bgcolor: '#b60003',
              '&:hover': { bgcolor: '#8f0002' },
              fontSize: '1rem',
              fontWeight: 700,
            }}
          >
            {loading ? 'Preparing download...' : `Download as ${exportFormat}`}
          </Button>
        </Paper>
      )}

      {/* ====== Sub-Tab 1: Profiling Report ====== */}
      {subTab === 1 && (
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>Data Profiling Report Export</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Generate a comprehensive executive report containing statistical summaries, 
            data quality scores, risk assessments, and match rules.
          </Typography>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ p: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <DataIcon sx={{ fontSize: 48, color: '#0f766e', mb: 2, mx: 'auto' }} />
                <Typography variant="h6" fontWeight="bold">Excel Summary</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Workbook with executive metrics, columns, and match rules.
                </Typography>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => downloadReport('XLSX')}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                >
                  Download Excel Report
                </Button>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ p: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <ReportIcon sx={{ fontSize: 48, color: '#b91c1c', mb: 2, mx: 'auto' }} />
                <Typography variant="h6" fontWeight="bold">PDF Format</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Standard professional report layout. Best for distribution and archiving.
                </Typography>
                <Button 
                  variant="contained" 
                  color="error" 
                  onClick={() => downloadReport('PDF')}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                >
                  Download PDF Report
                </Button>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ p: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <DataIcon sx={{ fontSize: 48, color: '#1e40af', mb: 2, mx: 'auto' }} />
                <Typography variant="h6" fontWeight="bold">HTML Format</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Stand-alone web report. Interactive and easy to share as a single file.
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={() => downloadReport('HTML')}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                >
                  Download HTML Report
                </Button>
              </Card>
            </Grid>
          </Grid>
          
          <Alert severity="info">
            Ensure you have run the **Data Profiling Engine** first to generate the necessary data for the report.
          </Alert>
        </Paper>
      )}

      {subTab === 2 && (
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <BatchIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h5" fontWeight="bold">Batch Export</Typography>
          </Box>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Split large datasets into multiple CSV files and download as a single zip archive.
          </Typography>

          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Rows per File</InputLabel>
                <Select
                  value={rowsPerFile}
                  label="Rows per File"
                  onChange={(e) => setRowsPerFile(Number(e.target.value))}
                >
                  <MenuItem value={10000}>10,000 rows</MenuItem>
                  <MenuItem value={50000}>50,000 rows</MenuItem>
                  <MenuItem value={100000}>100,000 rows</MenuItem>
                  <MenuItem value={250000}>250,000 rows</MenuItem>
                  <MenuItem value={500000}>500,000 rows</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">ESTIMATED CHUNKS</Typography>
                <Typography variant="h5" fontWeight="bold">
                  {Math.ceil(totalRows / rowsPerFile)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  @ {rowsPerFile.toLocaleString()} rows each · {totalRows.toLocaleString()} total rows
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <BatchIcon />}
                disabled={loading || totalRows === 0}
                onClick={async () => {
                  try {
                    setLoading(true);
                    setError('');
                    const response = await client.get(`/export/${currentDataset.id}/batch`, {
                      params: { chunk_size: rowsPerFile },
                      responseType: 'blob',
                    });
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `${currentDataset.filename}_batch.zip`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  } catch {
                    setError('Batch export failed. Please try again.');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? 'Preparing Zip…' : 'Download Zip'}
              </Button>
            </Grid>
          </Grid>

          {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

          <Alert severity="info" sx={{ mt: 3 }}>
            All parts are exported as CSV. Each file is named <code>filename_part001_of_N.csv</code>.
          </Alert>
        </Paper>
      )}
    </Box>
  );
}
