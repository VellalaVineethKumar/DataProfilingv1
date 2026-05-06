import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Alert, Tabs, Tab,
  Grid, Card, Chip, CircularProgress, LinearProgress,
  IconButton, TextField, MenuItem, Select,
  Accordion, AccordionSummary, AccordionDetails, Checkbox
} from '@mui/material';
import { useTaskProgress } from '../hooks/useTaskProgress';
import {
  AutoAwesome as AutoAwesomeIcon,
  Search as SearchIcon,
  FileDownload as FileDownloadIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Rule as RuleIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import client from '../api/client';
import { useStore } from '../store';

const DQ_DIMENSIONS = [
  "Accuracy", "Completeness", "Consistency", "Validity", 
  "Uniqueness", "Timeliness", "Integrity", "Conformity", "Character Length"
];

export default function RuleGenerator() {
  const currentDataset = useStore((state) => state.dataset);
  const rules = useStore((state) => state.rules);
  const setRules = useStore((state) => state.setRules);
  
  const [subTab, setSubTab] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [aiTaskId, setAiTaskId] = useState<string | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headerRow, setHeaderRow] = useState(0);
  const [error, setError] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedRules, setSelectedRules] = useState<Set<number>>(new Set());

  const toggleRule = (idx: number) => {
    setSelectedRules((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const progress = useTaskProgress(generating ? aiTaskId : null);

  // React to WebSocket progress events from AI task
  useEffect(() => {
    if (progress.status === 'complete' && aiTaskId) {
      client.get(`/ai/result/${aiTaskId}`)
        .then((res) => { setRules(res.data); setSubTab(2); })
        .catch(() => setError('Failed to fetch AI results'))
        .finally(() => { setGenerating(false); setAiTaskId(null); });
    } else if (progress.status === 'error') {
      setError(progress.message || 'AI generation failed');
      setGenerating(false);
      setAiTaskId(null);
    }
  }, [progress.status]);

  const downloadRules = (format: 'json' | 'csv') => {
    const filenameBase = `${currentDataset?.filename || 'rules'}_rules`;
    if (format === 'json') {
      const jsonBlob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' });
      const jsonUrl = window.URL.createObjectURL(jsonBlob);
      const link = document.createElement('a');
      link.href = jsonUrl;
      link.download = `${filenameBase}.json`;
      link.click();
      return;
    }

    const csvRows = [
      ['Column', 'Dimension', 'Data Quality Rule', 'Source'],
      ...rules.map((rule: any) => ([
        rule.Column || rule.business_field || '',
        rule.Dimension || rule.dimension || '',
        rule['Data Quality Rule'] || rule.data_quality_rule || '',
        rule.Source || 'AI',
      ])),
    ];
    const csvContent = csvRows.map((row) =>
      row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')
    ).join('\n');
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const csvUrl = window.URL.createObjectURL(csvBlob);
    const link = document.createElement('a');
    link.href = csvUrl;
    link.download = `${filenameBase}.csv`;
    link.click();
  };

  useEffect(() => {
    if (currentDataset) {
      fetchRules();
      fetchColumns();
      if (currentDataset.filename?.endsWith('.xlsx') || currentDataset.filename?.endsWith('.xls')) {
        fetchSheets();
      }
    }
  }, [currentDataset]);

  const fetchRules = async () => {
    try {
      const res = await client.get('/rules/');
      setRules(res.data);
    } catch (err) {
      console.error("No rules found yet");
    }
  };

  const fetchColumns = async () => {
    try {
      const res = await client.get(`/quality/columns/${currentDataset?.id}`);
      setColumns(res.data.columns);
    } catch (err) {
      console.error("Failed to fetch columns");
    }
  };

  const fetchSheets = async () => {
    try {
      const res = await client.get(`/ai/scan-sheets/${currentDataset?.id}`);
      setSheets(res.data);
      if (res.data.length > 0) setSelectedSheet(res.data[0]);
    } catch (err) {
      console.error("Failed to fetch sheets", err);
    }
  };

  const handleGenerateAI = async (deepScan = false) => {
    if (!currentDataset) return;
    setGenerating(true);
    setError('');
    setAiTaskId(null);
    try {
      const params = new URLSearchParams({ header_row: String(headerRow) });
      if (deepScan && selectedSheet) params.set('sheet_name', selectedSheet);
      const res = await client.post(`/ai/recommend-rules/${currentDataset.id}/start?${params}`);
      setAiTaskId(res.data.task_id);
      // generating stays true; useEffect above reacts to progress.status
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'AI Generation failed');
      setGenerating(false);
    }
  };

  const handleAddRule = () => {
    const newRule = {
      id: `temp-${Date.now()}`,
      Column: columns[0] || "",
      "Business Field": columns[0] || "",
      Dimension: "Validity",
      "Data Quality Rule": "New custom rule",
      Source: "Manual"
    };
    setRules([newRule, ...rules]);
    setSubTab(2);
  };

  const handleUpdateRule = (index: number, field: string, value: any) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
  };

  const handleDeleteRule = (index: number) => {
    const newRules = [...rules];
    newRules.splice(index, 1);
    setRules(newRules);
  };

  const saveRules = async () => {
    setGenerating(true);
    try {
      await client.post('/rules/save', {
        name: `AI Rules: ${currentDataset?.filename || 'dataset'}`,
        rules_json: JSON.stringify(rules),
      });
      alert("Rules saved successfully!");
    } catch (err) {
      alert("Failed to save rules");
    } finally {
      setGenerating(false);
    }
  };

  if (!currentDataset) {
    return <Alert severity="info" sx={{ m: 4 }}>Please load a dataset first.</Alert>;
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs
          value={subTab}
          onChange={(_, v) => { setSubTab(v); setError(''); }}
          variant="fullWidth"
          sx={{ borderBottom: '1px solid #e0e0e0' }}
        >
          <Tab icon={<SearchIcon />} label="Deep Scan" iconPosition="start" />
          <Tab icon={<AutoAwesomeIcon />} label="AI Recommendations" iconPosition="start" />
          <Tab icon={<RuleIcon />} label="Rule Configuration" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ====== Sub-Tab 0: Deep Scan ====== */}
      {subTab === 0 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>Deep Excel Sheet Scan</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Scan all rows to extract existing validation rules, cell comments, and metadata patterns.
          </Typography>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6}>
              <Card variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc' }}>
                <Typography variant="subtitle2" color="primary" fontWeight={600}>What gets scanned?</Typography>
                <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                  <li>Constraint rows & Cell comments</li>
                  <li>Merged cells & Metadata patterns</li>
                </ul>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc' }}>
                <Typography variant="subtitle2" color="primary" fontWeight={600}>Rule Sheet Settings</Typography>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                   <Select 
                    fullWidth size="small" value={selectedSheet}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                    displayEmpty
                   >
                    <MenuItem value="" disabled>-- Select Sheet --</MenuItem>
                    {sheets.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                   </Select>
                   <TextField
                    size="small"
                    type="number"
                    label="Header Row"
                    value={headerRow}
                    onChange={(e) => setHeaderRow(Number(e.target.value) || 0)}
                    inputProps={{ min: 0, max: 20 }}
                   />
                </Box>
              </Card>
            </Grid>
          </Grid>

          <Button
            variant="contained"
            size="large"
            startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
            onClick={() => handleGenerateAI(true)}
            disabled={generating || !selectedSheet}
            sx={{ px: 6 }}
          >
            {generating ? 'Scanning...' : 'Start Deep Scan'}
          </Button>

          {generating && (
            <Box sx={{ mt: 3 }}>
              <LinearProgress
                variant={progress.percent > 0 ? 'determinate' : 'indeterminate'}
                value={progress.percent}
                sx={{ borderRadius: 1 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {progress.message || 'Scanning...'}
                </Typography>
                {progress.detail && (
                  <Typography variant="caption" color="text.secondary">{progress.detail}</Typography>
                )}
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* ====== Sub-Tab 1: AI Recommended Rules ====== */}
      {subTab === 1 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>AI Rule Discovery</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Automatically discover data quality rules using Azure OpenAI analysis of your data samples.
          </Typography>

          <Box sx={{ bgcolor: '#f0f9ff', p: 3, borderRadius: 2, mb: 4, border: '1px solid #bae6fd' }}>
            <Typography variant="subtitle2" color="primary.main" gutterBottom>AI Analysis Strategy</Typography>
            <Typography variant="body2">The engine will analyze column names and sample values to recommend rules for Validity, Completeness, Uniqueness, and Conformity.</Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
            onClick={() => handleGenerateAI(false)}
            disabled={generating}
            sx={{ px: 6, bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
          >
            {generating ? 'Generating...' : 'Generate Recommendations'}
          </Button>

          {generating && (
            <Box sx={{ mt: 3 }}>
              <LinearProgress
                variant={progress.percent > 0 ? 'determinate' : 'indeterminate'}
                value={progress.percent}
                sx={{ borderRadius: 1 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {progress.message || 'Connecting to AI...'}
                </Typography>
                {progress.detail && (
                  <Typography variant="caption" color="text.secondary">{progress.detail}</Typography>
                )}
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* ====== Sub-Tab 2: Manual Configuration ====== */}
      {subTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">Active Rules Library</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button startIcon={<AddIcon />} variant="outlined" onClick={handleAddRule}>Add Custom Rule</Button>
              <Button startIcon={<FileDownloadIcon />} variant="outlined" onClick={() => downloadRules('json')} disabled={rules.length === 0}>
                Download JSON
              </Button>
              <Button startIcon={<FileDownloadIcon />} variant="outlined" onClick={() => downloadRules('csv')} disabled={rules.length === 0}>
                Download CSV
              </Button>
              <Button 
                startIcon={<SaveIcon />} 
                variant="contained" 
                color="success" 
                onClick={saveRules}
                disabled={generating}
              >
                Save Library
              </Button>
            </Box>
          </Box>

          {rules.length === 0 ? (
            <Paper elevation={2} sx={{ borderRadius: 2, py: 6, textAlign: 'center' }}>
              <Typography color="text.disabled">No rules found. Start by generating or adding manual rules.</Typography>
            </Paper>
          ) : (
            <Box>
              {rules.map((rule: any, idx: number) => (
                <Accordion
                  key={rule.id || idx}
                  disableGutters
                  elevation={0}
                  variant="outlined"
                  sx={{ mb: 1, borderRadius: '8px !important', '&::before': { display: 'none' } }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                      <Checkbox
                        size="small"
                        checked={selectedRules.has(idx)}
                        onClick={(e) => { e.stopPropagation(); toggleRule(idx); }}
                        sx={{ p: 0.5, color: '#b60003', '&.Mui-checked': { color: '#b60003' } }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {rule.rule_type || rule.Dimension || rule.dimension || rule.type || 'Rule'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {Array.isArray(rule.columns) ? rule.columns.join(', ') : (rule.Column || rule.column || rule.columns || rule.business_field || '—')}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={rule.Source || (rule.id ? 'AI' : 'New')}
                          size="small"
                          color={rule.Source === 'Manual' ? 'secondary' : 'primary'}
                          variant="outlined"
                        />
                        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteRule(idx); }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box sx={{ width: 90, flexShrink: 0 }}>
                        <LinearProgress
                          variant="determinate"
                          value={rule.confidence ?? 0}
                          sx={{ height: 4, borderRadius: 2, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#b60003' } }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          {rule.confidence ?? 0}% confidence
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {rule.rationale || rule.description || rule['Data Quality Rule'] || rule.data_quality_rule || rule.message || '—'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        <Select
                          size="small"
                          value={rule.Column || rule.business_field || ""}
                          onChange={(e) => handleUpdateRule(idx, 'Column', e.target.value)}
                          displayEmpty
                          sx={{ minWidth: 160 }}
                        >
                          <MenuItem value="" disabled>-- Column --</MenuItem>
                          {columns.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </Select>
                        <Select
                          size="small"
                          value={rule.Dimension || rule.dimension || "Validity"}
                          onChange={(e) => handleUpdateRule(idx, 'Dimension', e.target.value)}
                          sx={{ minWidth: 140 }}
                        >
                          {DQ_DIMENSIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                        </Select>
                        <TextField
                          size="small"
                          value={rule["Data Quality Rule"] || rule.data_quality_rule || ""}
                          onChange={(e) => handleUpdateRule(idx, 'Data Quality Rule', e.target.value)}
                          placeholder="Data Quality Rule"
                          sx={{ flex: 1, minWidth: 200 }}
                        />
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* ====== Sticky Save Footer ====== */}
      {selectedRules.size > 0 && (
        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            bgcolor: '#221E1F',
            color: '#fff',
            px: 3,
            py: 2,
            borderRadius: 2,
            mt: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="body2" sx={{ color: '#d1d5db' }}>
            {selectedRules.size} rule{selectedRules.size > 1 ? 's' : ''} selected
          </Typography>
          <Button
            variant="contained"
            size="small"
            sx={{ bgcolor: '#b60003', '&:hover': { bgcolor: '#8f0002' } }}
            onClick={saveRules}
          >
            Save to Ruleset
          </Button>
        </Box>
      )}
    </Box>
  );
}
