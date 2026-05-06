import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Timeline as DriftIcon,
  Warning as WarningIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { Chip } from '@mui/material';

import client from '../api/client';
import { useStore } from '../store';

interface Baseline {
  id: number;
  name: string;
  version_label: string | null;
  dataset_id: number | null;
  dataset_name: string | null;
  created_at: string;
}

interface DriftAlert {
  column: string;
  type: string;
  message: string;
  baseline: string | number | null;
  current: string | number | null;
}

export default function Drift() {
  const currentDataset = useStore((state) => state.dataset);
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [selectedBaseline, setSelectedBaseline] = useState<number | ''>('');
  const [baselineName, setBaselineName] = useState('');
  const [nullThreshold, setNullThreshold] = useState(5);
  const [uniqueThreshold, setUniqueThreshold] = useState(10);
  const [meanThreshold, setMeanThreshold] = useState(2);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [alerts, setAlerts] = useState<DriftAlert[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void fetchBaselines();
  }, []);

  const fetchBaselines = async () => {
    setLoading(true);
    try {
      const url = currentDataset
        ? `/drift/baselines/dataset/${currentDataset.id}`
        : '/drift/baselines';
      const response = await client.get(url);
      setBaselines(response.data);
    } catch (error) {
      console.error('Failed to fetch baselines', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBaseline = async () => {
    if (!currentDataset || !baselineName) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await client.post(`/drift/baselines/${currentDataset.id}?name=${encodeURIComponent(baselineName)}`);
      setMessage({
        type: 'success',
        text: `Baseline '${baselineName}' (${res.data.version_label}) saved successfully.`,
      });
      setBaselineName('');
      await fetchBaselines();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save baseline' });
    } finally {
      setSaving(false);
    }
  };

  const handleDetectDrift = async () => {
    if (!currentDataset || !selectedBaseline) return;
    setDetecting(true);
    setMessage(null);
    setAlerts([]);
    try {
      const response = await client.post(
        `/drift/detect/${currentDataset.id}?baseline_id=${selectedBaseline}&null_threshold=${nullThreshold}&unique_threshold=${uniqueThreshold}&mean_threshold=${meanThreshold}`
      );
      setAlerts(response.data.alerts || []);
      if ((response.data.alerts || []).length === 0) {
        setMessage({ type: 'success', text: 'No significant drift detected.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Drift detection failed' });
    } finally {
      setDetecting(false);
    }
  };

  const handleDeleteBaseline = async () => {
    if (!selectedBaseline) return;
    try {
      await client.delete(`/drift/baselines/${selectedBaseline}`);
      setMessage({ type: 'success', text: 'Baseline deleted successfully.' });
      setSelectedBaseline('');
      setAlerts([]);
      await fetchBaselines();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to delete baseline' });
    }
  };

  if (!currentDataset) {
    return <Alert severity="info" sx={{ m: 4 }}>Load a dataset first to manage baselines and detect drift.</Alert>;
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Data Drift Detection
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Compare the current dataset against a saved baseline to identify statistical shifts,
        schema changes, and data quality degradation over time.
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SaveIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight="bold">Create Baseline</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Save the current dataset state as a gold standard for future comparisons.
            </Typography>

            <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 1, mb: 3 }}>
              <Typography variant="caption" color="text.secondary">CURRENT DATASET</Typography>
              <Typography variant="body1" fontWeight={600}>{currentDataset.filename}</Typography>
              <Typography variant="body2">{currentDataset.row_count?.toLocaleString()} rows</Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                label="Baseline Name"
                value={baselineName}
                onChange={(e) => setBaselineName(e.target.value)}
                placeholder="e.g. April_2024_Final"
              />
              <Button
                variant="contained"
                onClick={handleSaveBaseline}
                disabled={saving || !baselineName}
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              >
                Save
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <DriftIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">Compare & Detect Drift</Typography>
              </Box>
              <IconButton size="small" onClick={() => void fetchBaselines()} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select a baseline and tune thresholds before running drift analysis.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={7}>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Baseline</InputLabel>
                  <Select
                    value={selectedBaseline}
                    label="Select Baseline"
                    onChange={(e) => setSelectedBaseline(e.target.value as number)}
                  >
                    {baselines.map((baseline) => (
                      <MenuItem key={baseline.id} value={baseline.id}>
                        {baseline.name}
                        {baseline.version_label ? ` [${baseline.version_label}]` : ''}
                        {` — ${new Date(baseline.created_at).toLocaleDateString()}`}
                      </MenuItem>
                    ))}
                    {baselines.length === 0 && !loading && (
                      <MenuItem disabled>No baselines found</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={2.5}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleDetectDrift}
                  disabled={detecting || !selectedBaseline}
                  startIcon={detecting ? <CircularProgress size={20} /> : <DriftIcon />}
                >
                  Analyze
                </Button>
              </Grid>
              <Grid item xs={6} sm={2.5}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  onClick={handleDeleteBaseline}
                  disabled={!selectedBaseline}
                  startIcon={<DeleteIcon />}
                >
                  Delete
                </Button>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Null % threshold"
                  value={nullThreshold}
                  onChange={(e) => setNullThreshold(Number(e.target.value) || 5)}
                  inputProps={{ min: 0.1, step: 0.5 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Unique % threshold"
                  value={uniqueThreshold}
                  onChange={(e) => setUniqueThreshold(Number(e.target.value) || 10)}
                  inputProps={{ min: 0.1, step: 0.5 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Mean shift (sigma)"
                  value={meanThreshold}
                  onChange={(e) => setMeanThreshold(Number(e.target.value) || 2)}
                  inputProps={{ min: 0.1, step: 0.5 }}
                />
              </Grid>
            </Grid>

            {detecting && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>Running statistical analysis...</Typography>
                <LinearProgress />
              </Box>
            )}

            {!detecting && alerts.length > 0 && (
              <Alert severity="warning" sx={{ mt: 3 }}>
                Detected drift in {alerts.length} columns.
              </Alert>
            )}

            {!detecting && alerts.length === 0 && selectedBaseline && !message && (
              <Box sx={{ mt: 4, textAlign: 'center', p: 2, bgcolor: '#f0f9ff', borderRadius: 1 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="body2">
                  Ready to analyze drift against <b>{baselines.find((b) => b.id === selectedBaseline)?.name}</b>
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {alerts.length > 0 && (
        <TableContainer component={Paper} sx={{ mt: 4 }}>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center' }}>
            <WarningIcon color="warning" sx={{ mr: 1 }} />
            <Typography variant="h6" fontWeight="bold">Drift Alerts</Typography>
          </Box>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: '#f8f9fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Column</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Message</TableCell>
                <TableCell align="right">Baseline</TableCell>
                <TableCell align="right">Current</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.map((alert, index) => (
                <TableRow
                  key={`${alert.column}-${index}`}
                  hover
                  sx={{
                    bgcolor:
                      (alert.type?.toLowerCase().includes('type') || alert.type?.toLowerCase().includes('schema'))
                        ? 'rgba(254,242,242,0.6)'
                        : (alert.type?.toLowerCase().includes('mean') || alert.type?.toLowerCase().includes('null') || alert.type?.toLowerCase().includes('unique'))
                        ? 'rgba(255,251,235,0.6)'
                        : 'transparent',
                  }}
                >
                  <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                    {alert.column}
                  </TableCell>
                  <TableCell>{alert.type}</TableCell>
                  <TableCell>{alert.message}</TableCell>
                  <TableCell align="right">{typeof alert.baseline === 'number' ? alert.baseline.toFixed(2) : alert.baseline}</TableCell>
                  <TableCell align="right">{typeof alert.current === 'number' ? alert.current.toFixed(2) : alert.current}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {baselines.length > 0 && (
        <TableContainer component={Paper} sx={{ mt: 4 }}>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center' }}>
            <HistoryIcon color="action" sx={{ mr: 1 }} />
            <Typography variant="h6" fontWeight="bold">
              Baseline Version History
              <Chip size="small" label={`${baselines.length} versions`} sx={{ ml: 1 }} />
            </Typography>
          </Box>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8f9fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Version</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {baselines.map((b, index) => (
                <TableRow key={b.id} hover selected={selectedBaseline === b.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.5 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#b60003', flexShrink: 0 }} />
                        {index < baselines.length - 1 && (
                          <Box sx={{ width: 2, height: 24, bgcolor: 'divider', mt: 0.25 }} />
                        )}
                      </Box>
                      <Chip
                        size="small"
                        label={b.version_label || '—'}
                        color="primary"
                        variant="outlined"
                        sx={{ borderColor: '#b60003', color: '#b60003' }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontWeight: selectedBaseline === b.id ? 700 : 400 }}>{b.name}</TableCell>
                  <TableCell>{new Date(b.created_at).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setSelectedBaseline(b.id)}>Select</Button>
                    <IconButton size="small" color="error" onClick={async () => {
                      await client.delete(`/drift/baselines/${b.id}`);
                      await fetchBaselines();
                      if (selectedBaseline === b.id) setSelectedBaseline('');
                    }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
