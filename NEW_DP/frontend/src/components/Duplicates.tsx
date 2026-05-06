import { useState } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Button, Alert,
  Select, MenuItem, FormControl, InputLabel, Slider,
  Grid, Card, CardContent, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableRow,
  Checkbox, Tooltip
} from '@mui/material';
import {
  ContentCopy as ExactIcon,
  Tune as FuzzyIcon,
  MergeType as CombinedIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  CallMerge as MergeIcon,
} from '@mui/icons-material';
import { useStore } from '../store';
import client from '../api/client';

export default function Duplicates() {
  const currentDataset = useStore((state) => state.dataset);
  const [subTab, setSubTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState('');

  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set());
  const [merging, setMerging] = useState(false);

  const toggleGroupSelect = (groupId: number) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  };

  const handleMergeSelected = async () => {
    if (selectedGroups.size === 0) return;
    setMerging(true);
    setError('');
    try {
      const groupsToMerge = results.filter(g => selectedGroups.has(g.group_id));
      const res = await client.post(`/duplicates/merge/${currentDataset?.id}`, { groups: groupsToMerge });
      setResults(prev => prev.filter(g => !selectedGroups.has(g.group_id)));
      setSelectedGroups(new Set());
      alert(`Merged ${res.data.merged_groups} group(s). Removed ${res.data.rows_removed} duplicate rows.`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Merge failed');
    } finally {
      setMerging(false);
    }
  };

  // Exact match state
  const [exactSubsetCols, setExactSubsetCols] = useState<string[]>([]);
  const [exactKeep, setExactKeep] = useState('first');

  // Fuzzy match state
  const [fuzzyCols, setFuzzyCols] = useState<string[]>([]);
  const [fuzzyThreshold, setFuzzyThreshold] = useState(85);
  const [fuzzyAlgo, setFuzzyAlgo] = useState('rapidfuzz');

  // Combined match state
  const [combinedExactCols, setCombinedExactCols] = useState<string[]>([]);
  const [combinedFuzzyCols, setCombinedFuzzyCols] = useState<string[]>([]);
  const [combinedThreshold, setCombinedThreshold] = useState(85);
  const [combinedAlgo, setCombinedAlgo] = useState('rapidfuzz');

  const handleExportResults = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await client.post(`/duplicates/export/${currentDataset?.id}`, {
        groups: results
      }, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `duplicate_results_${currentDataset?.filename}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  if (!currentDataset) {
    return <Alert severity="info" sx={{ m: 4 }}>Please load a dataset first.</Alert>;
  }

  const allColumns = currentDataset.columns || [];

  const runExactScan = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await client.post(`/duplicates/exact/${currentDataset.id}`, {
        columns: exactSubsetCols.length > 0 ? exactSubsetCols : null,
        keep: exactKeep
      });
      setResults(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Exact scan failed');
    } finally {
      setLoading(false);
    }
  };

  const runFuzzyScan = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await client.post(`/duplicates/fuzzy/${currentDataset.id}`, {
        columns: fuzzyCols,
        threshold: fuzzyThreshold,
        algorithm: fuzzyAlgo
      });
      setResults(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Fuzzy scan failed');
    } finally {
      setLoading(false);
    }
  };

  const runCombinedScan = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await client.post(`/duplicates/combined/${currentDataset.id}`, {
        exact_columns: combinedExactCols,
        fuzzy_columns: combinedFuzzyCols,
        threshold: combinedThreshold,
        algorithm: combinedAlgo
      });
      setResults(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Combined scan failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>Find Duplicates</Typography>

      {/* Sub-Tab Navigation */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs
          value={subTab}
          onChange={(_, v) => { setSubTab(v); setResults([]); setError(''); }}
          variant="fullWidth"
          sx={{
            borderBottom: '1px solid #e0e0e0',
            '& .MuiTabs-indicator': { bgcolor: '#b60003', height: 3 },
            '& .MuiTab-root.Mui-selected': { color: '#b60003' },
          }}
        >
          <Tab icon={<ExactIcon />} label="Exact Match" iconPosition="start" />
          <Tab icon={<FuzzyIcon />} label="Fuzzy Match" iconPosition="start" />
          <Tab icon={<CombinedIcon />} label="Combined Match" iconPosition="start" />
        </Tabs>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* ====== Sub-Tab 0: Exact Match ====== */}
      {subTab === 0 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>Exact Duplicate Detection</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Find rows that have identical values across selected columns.
          </Typography>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Check specific columns (empty = all)</InputLabel>
                <Select
                  multiple
                  value={exactSubsetCols}
                  label="Check specific columns (empty = all)"
                  onChange={(e) => setExactSubsetCols(e.target.value as string[])}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((v) => <Chip key={v} label={v} size="small" />)}
                    </Box>
                  )}
                >
                  {allColumns.map((col: string) => (
                    <MenuItem key={col} value={col}>{col}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Keep Strategy</InputLabel>
                <Select value={exactKeep} label="Keep Strategy" onChange={(e) => setExactKeep(e.target.value)}>
                  <MenuItem value="first">Keep First</MenuItem>
                  <MenuItem value="last">Keep Last</MenuItem>
                  <MenuItem value="none">Remove All</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                sx={{ height: '56px' }}
                onClick={runExactScan}
                disabled={loading}
              >
                {loading ? 'Scanning...' : 'Scan for Exact Duplicates'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ====== Sub-Tab 1: Fuzzy Match ====== */}
      {subTab === 1 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>Fuzzy Duplicate Detection</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Find rows with similar (not identical) text values using string similarity algorithms.
          </Typography>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Columns to scan</InputLabel>
                <Select
                  multiple
                  value={fuzzyCols}
                  label="Columns to scan"
                  onChange={(e) => setFuzzyCols(e.target.value as string[])}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((v) => <Chip key={v} label={v} size="small" />)}
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
              <Typography variant="body2" gutterBottom>Similarity Threshold: {fuzzyThreshold}%</Typography>
              <Slider
                value={fuzzyThreshold}
                onChange={(_, v) => setFuzzyThreshold(v as number)}
                min={50} max={100} step={1}
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Algorithm</InputLabel>
                <Select value={fuzzyAlgo} label="Algorithm" onChange={(e) => setFuzzyAlgo(e.target.value)}>
                  <MenuItem value="rapidfuzz">RapidFuzz</MenuItem>
                  <MenuItem value="jaro_winkler">Jaro-Winkler</MenuItem>
                  <MenuItem value="metaphone">Metaphone</MenuItem>
                  <MenuItem value="combined">Combined</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Button
            variant="contained"
            size="large"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
            disabled={fuzzyCols.length === 0 || loading}
            onClick={runFuzzyScan}
          >
            {loading ? 'Scanning...' : 'Scan for Fuzzy Duplicates'}
          </Button>
          {fuzzyCols.length === 0 && (
            <Typography variant="caption" color="text.disabled" sx={{ ml: 2 }}>
              Select at least one column.
            </Typography>
          )}
        </Paper>
      )}

      {/* ====== Sub-Tab 2: Combined Match ====== */}
      {subTab === 2 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>Combined Duplicate Detection</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Use both exact and fuzzy matching for enterprise-grade deduplication.
          </Typography>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Exact match columns</InputLabel>
                <Select
                  multiple
                  value={combinedExactCols}
                  label="Exact match columns"
                  onChange={(e) => setCombinedExactCols(e.target.value as string[])}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((v) => <Chip key={v} label={v} size="small" />)}
                    </Box>
                  )}
                >
                  {allColumns.map((col: string) => (
                    <MenuItem key={col} value={col}>{col}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Fuzzy match columns</InputLabel>
                <Select
                  multiple
                  value={combinedFuzzyCols}
                  label="Fuzzy match columns"
                  onChange={(e) => setCombinedFuzzyCols(e.target.value as string[])}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((v) => <Chip key={v} label={v} size="small" />)}
                    </Box>
                  )}
                >
                  {allColumns.map((col: string) => (
                    <MenuItem key={col} value={col}>{col}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" gutterBottom>Fuzzy Threshold: {combinedThreshold}%</Typography>
              <Slider
                value={combinedThreshold}
                onChange={(_, v) => setCombinedThreshold(v as number)}
                min={50} max={100} step={1}
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Algorithm</InputLabel>
                <Select value={combinedAlgo} label="Algorithm" onChange={(e) => setCombinedAlgo(e.target.value)}>
                  <MenuItem value="rapidfuzz">RapidFuzz</MenuItem>
                  <MenuItem value="jaro_winkler">Jaro-Winkler</MenuItem>
                  <MenuItem value="metaphone">Metaphone</MenuItem>
                  <MenuItem value="combined">Combined</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Button
            variant="contained"
            size="large"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
            disabled={combinedExactCols.length === 0 || combinedFuzzyCols.length === 0 || loading}
            onClick={runCombinedScan}
          >
            {loading ? 'Scanning...' : 'Scan for Combined Duplicates'}
          </Button>
        </Paper>
      )}

      {/* ====== Results Section ====== */}
      {results.length > 0 && (
        <Box sx={{ mt: 4 }}>
          {/* Toolbar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6">
              Detected Duplicate Groups ({results.length})
              {selectedGroups.size > 0 && (
                <Chip label={`${selectedGroups.size} selected`} size="small" color="primary" sx={{ ml: 1 }} />
              )}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {selectedGroups.size > 0 && (
                <Tooltip title="Merge each selected group into one row by coalescing non-null values">
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={merging ? <CircularProgress size={18} color="inherit" /> : <MergeIcon />}
                    onClick={handleMergeSelected}
                    disabled={merging}
                  >
                    {merging ? 'Merging…' : `Merge ${selectedGroups.size} Group${selectedGroups.size > 1 ? 's' : ''}`}
                  </Button>
                </Tooltip>
              )}
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportResults}
                disabled={loading}
              >
                Export CSV
              </Button>
            </Box>
          </Box>

          {results.map((group) => {
            const isSelected = selectedGroups.has(group.group_id);
            return (
              <Card
                key={group.group_id}
                variant="outlined"
                sx={{ mb: 2, borderColor: isSelected ? 'secondary.main' : undefined, borderWidth: isSelected ? 2 : 1 }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleGroupSelect(group.group_id)}
                        size="small"
                        color="secondary"
                      />
                      <Typography variant="subtitle1" fontWeight="bold">Group #{group.group_id}</Typography>
                    </Box>
                    <Box>
                      <Chip label={`${group.indices.length} rows`} size="small" sx={{ mr: 1 }} />
                      {group.similarity_score != null && (
                        <Chip
                          label={`${group.similarity_score.toFixed(1)}% match`}
                          size="small"
                          sx={{
                            bgcolor: '#fef2f2',
                            color: '#b60003',
                            fontWeight: 600,
                            border: '1px solid #fecaca',
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ fontStyle: 'italic', mb: 1, pl: 4 }}>
                    Key: {group.representative_value}
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableBody>
                        {group.values.slice(0, 5).map((row: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ fontSize: '0.75rem' }}>
                              {Object.entries(row).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                            </TableCell>
                          </TableRow>
                        ))}
                        {group.values.length > 5 && (
                          <TableRow>
                            <TableCell sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>
                              … and {group.values.length - 5} more rows
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {!loading && results.length === 0 && !error && (
        <Box sx={{ p: 4, textAlign: 'center', color: 'text.disabled', mt: 3, borderTop: '1px solid #eee' }}>
          <Typography variant="body1">No duplicates scanned yet or no matches found.</Typography>
        </Box>
      )}
    </Box>
  );
}
