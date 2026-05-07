// frontend/src/components/DataQuality.tsx
//
// Data Quality redesign:
//   1. Plain-English rule presets (no raw regex required for BAs / DQ analysts).
//   2. Auto-Fix is preview-then-approve — never writes to source without review.
//   3. Guided 1 → 2 → 3 workflow banner at the top.
//   4. All three operations survive: validation (flag), transformation (modify), rejection (quarantine).

import { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Paper, Accordion, AccordionSummary, AccordionDetails,
  Select, MenuItem, FormControl, InputLabel, TextField, IconButton, Alert, CircularProgress,
  Divider, Tabs, Tab, Card, CardContent, Grid, Chip, Stack,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SettingsIcon from '@mui/icons-material/Settings';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import SaveIcon from '@mui/icons-material/Save';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';

import { useStore } from '../store';
import { useToast } from '../hooks/useToast';
import client from '../api/client';
import RulePicker from './dataQuality/RulePicker';
import AutoFixPreview, { type AutoFixPreviewData } from './dataQuality/AutoFixPreview';
import { summarizeRule, ruleKind, KIND_META, type Rule } from './dataQuality/rulePresets';

const BANNER_KEY = 'dq-banner-dismissed';

export default function DataQuality() {
  const currentDataset = useStore((state) => state.dataset);
  const toast = useToast();
  const [subTab, setSubTab] = useState(0);

  const [columns, setColumns] = useState<string[]>([]);
  const [samples, setSamples] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [rulesConfig, setRulesConfig] = useState<Record<string, Rule[]>>({});
  const [running, setRunning] = useState(false);
  const [runSummary, setRunSummary] = useState<any>(null);

  // Rule picker dialog
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerColumn, setPickerColumn] = useState<string>('');

  // AI Suggestion state
  const [aiCol, setAiCol] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggesting, setAiSuggesting] = useState(false);

  // Preview state
  const [previewTab, setPreviewTab] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{ columns: string[]; rows: any[] }>({ columns: [], rows: [] });

  // Rule Library state
  const [ruleSets, setRuleSets] = useState<any[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [newRuleSetName, setNewRuleSetName] = useState('');

  // Auto-Fix preview/apply
  const [autoFixOpen, setAutoFixOpen] = useState(false);
  const [autoFixLoading, setAutoFixLoading] = useState(false);
  const [autoFixApplying, setAutoFixApplying] = useState(false);
  const [autoFixData, setAutoFixData] = useState<AutoFixPreviewData | null>(null);
  const [autoFixOps, setAutoFixOps] = useState<string[]>([]);

  // Standardization state
  const [standardizeCols, setStandardizeCols] = useState<string[]>([]);
  const [standardizeCase, setStandardizeCase] = useState('lower');
  const [standardizeStyle, setStandardizeStyle] = useState('apa');
  const [standardizing, setStandardizing] = useState(false);

  // Column name standardization
  const [colNameStyle, setColNameStyle] = useState('snake_case');
  const [standardizingColNames, setStandardizingColNames] = useState(false);

  // Workflow banner dismissal — persisted across reloads
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(BANNER_KEY) === '1'; } catch { return false; }
  });
  const dismissBanner = () => {
    setBannerDismissed(true);
    try { localStorage.setItem(BANNER_KEY, '1'); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (currentDataset) {
      loadColumns();
      loadRuleSets();
    }
  }, [currentDataset]);

  useEffect(() => {
    if (runSummary) {
      loadPreview(previewTab === 0 ? 'cleaned' : 'rejected');
    }
  }, [runSummary, previewTab]);

  const loadColumns = async () => {
    try {
      setLoading(true);
      const res = await client.get(`/quality/columns/${currentDataset?.id}`);
      setColumns(res.data.columns);
      setSamples(res.data.samples);

      const initialConfig: Record<string, Rule[]> = {};
      res.data.columns.forEach((c: string) => { initialConfig[c] = []; });
      setRulesConfig(initialConfig);
    } catch (err: any) {
      setError('Failed to load columns for quality evaluation.');
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async (type: 'cleaned' | 'rejected') => {
    if (!currentDataset) return;
    try {
      setPreviewLoading(true);
      const res = await client.get(`/quality/preview/${currentDataset.id}?type=${type}`);
      setPreviewData(res.data);
    } catch (err) {
      console.error('Failed to load preview', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const loadRuleSets = async () => {
    try {
      const res = await client.get('/rules/');
      setRuleSets(res.data);
    } catch (err) {
      console.error('Failed to load libraries', err);
    }
  };

  const handleSaveRuleSet = async () => {
    if (!newRuleSetName) return;
    try {
      await client.post('/rules/save', {
        name: newRuleSetName,
        rules_json: JSON.stringify(rulesConfig),
      });
      setNewRuleSetName('');
      setSaveOpen(false);
      loadRuleSets();
      toast.success('Template saved to library');
    } catch (err: any) {
      toast.error('Failed to save template: ' + (err?.response?.data?.detail || err.message));
    }
  };

  const handleLoadRuleSet = (rulesJson: string) => {
    try {
      const loaded = JSON.parse(rulesJson);
      setRulesConfig({ ...rulesConfig, ...loaded });
      toast.success('Template applied');
    } catch (err) {
      toast.error('Failed to parse template rules');
    }
  };

  // ---------------------------------------------------------------------------
  // Auto-Fix: preview-then-apply
  // ---------------------------------------------------------------------------

  const openAutoFixPreview = async () => {
    if (!currentDataset) return;
    setAutoFixOpen(true);
    setAutoFixData(null);
    setAutoFixOps([]);
    setAutoFixLoading(true);
    try {
      const res = await client.post(`/quality/auto-fix/${currentDataset.id}?dry_run=true`);
      setAutoFixData(res.data.preview);
      setAutoFixOps(res.data.operations || []);
    } catch (err: any) {
      setError('Auto-fix preview failed: ' + (err?.response?.data?.detail || err.message));
      setAutoFixOpen(false);
    } finally {
      setAutoFixLoading(false);
    }
  };

  const applyAutoFix = async () => {
    if (!currentDataset) return;
    try {
      setAutoFixApplying(true);
      await client.post(`/quality/auto-fix/${currentDataset.id}?dry_run=false`);
      // Reload — column names may have changed
      window.location.reload();
    } catch (err: any) {
      setError('Auto-fix failed: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setAutoFixApplying(false);
    }
  };

  const downloadFile = async (type: 'cleaned' | 'rejected') => {
    if (!currentDataset) return;
    try {
      const res = await client.get(`/quality/download/${currentDataset.id}?type=${type}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${currentDataset.filename}_${type}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to download file');
    }
  };

  // ---------------------------------------------------------------------------
  // Rule mutations
  // ---------------------------------------------------------------------------

  const openRulePicker = (col: string) => {
    setPickerColumn(col);
    setPickerOpen(true);
  };

  const handlePickerAdd = (rule: Rule) => {
    setRulesConfig({
      ...rulesConfig,
      [pickerColumn]: [...(rulesConfig[pickerColumn] || []), rule],
    });
  };

  const deleteRule = (colName: string, ruleIndex: number) => {
    const colRules = [...rulesConfig[colName]];
    colRules.splice(ruleIndex, 1);
    setRulesConfig({ ...rulesConfig, [colName]: colRules });
  };

  const runQuality = async () => {
    try {
      setRunning(true);
      setError('');
      setRunSummary(null);
      const res = await client.post(`/quality/run/${currentDataset?.id}`, {
        rules: rulesConfig,
      });
      setRunSummary(res.data);
      setSubTab(2); // Auto-switch to Results
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Data quality execution failed.');
    } finally {
      setRunning(false);
    }
  };

  const handleAiSuggest = async () => {
    if (!aiCol || !aiPrompt) return;
    try {
      setAiSuggesting(true);
      const res = await client.post(`/quality/ai-suggest/${currentDataset?.id}`, {
        column: aiCol,
        prompt: aiPrompt,
      });

      const suggestion = res.data;
      const newRule: Rule = {
        mode: suggestion.mode,
        pattern: suggestion.pattern || '',
        replace: suggestion.replace || '',
        case: suggestion.case || 'UPPERCASE',
        length_mode: suggestion.length_mode || 'Exact',
        min_length: suggestion.min_length || 0,
        max_length: suggestion.max_length || 50,
        exact_length: suggestion.exact_length || 10,
      };

      setRulesConfig({
        ...rulesConfig,
        [aiCol]: [...(rulesConfig[aiCol] || []), newRule],
      });
      setAiPrompt('');
      toast.success(`AI added rule: ${suggestion.explanation}`);
    } catch (err: any) {
      toast.error('AI suggestion failed: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleStandardize = async () => {
    if (standardizeCols.length === 0) {
      toast.warning('Please select at least one column');
      return;
    }
    try {
      setStandardizing(true);
      const res = await client.post(`/quality/standardize-text/${currentDataset?.id}`, {
        columns: standardizeCols,
      }, {
        params: { case: standardizeCase, style: standardizeStyle },
      });
      toast.success(res.data.message);
      loadColumns();
    } catch (err: any) {
      toast.error('Standardization failed: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setStandardizing(false);
    }
  };

  const handleStandardizeColumns = async () => {
    if (!currentDataset) return;
    try {
      setStandardizingColNames(true);
      const res = await client.post(`/quality/standardize-columns/${currentDataset.id}`, null, {
        params: { case_type: colNameStyle },
      });
      const preview = res.data.columns.slice(0, 5).join(', ') + (res.data.columns.length > 5 ? '…' : '');
      toast.success(`${res.data.message} — new names: ${preview}`);
      window.location.reload();
    } catch (err: any) {
      toast.error('Column rename failed: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setStandardizingColNames(false);
    }
  };

  const gridColumns: GridColDef[] = previewData.columns.map((col) => ({
    field: col,
    headerName: col,
    width: 150,
    editable: false,
  }));

  const totalRulesCount = Object.values(rulesConfig).reduce((sum, rules) => sum + rules.length, 0);
  const columnsWithRules = Object.values(rulesConfig).filter((rs) => rs.length > 0).length;

  if (!currentDataset) {
    return <Alert severity="info" sx={{ m: 4 }}>Please load a dataset first.</Alert>;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      {/* Guided workflow banner */}
      {!bannerDismissed && (
        <Paper
          elevation={0}
          sx={{
            mb: 3, p: 2.5, borderRadius: 2,
            border: '1px solid', borderColor: 'divider',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1a1f2e' : '#fafafa',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                Recommended workflow
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                You can use the tools in any order, but this is the fastest path from messy data to a clean export.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <WorkflowStep
                  num={1}
                  title="Quick clean"
                  body="Run Auto-Fix to handle duplicates, missing values, and column names. You preview every change before committing."
                  active={subTab === 0}
                />
                <WorkflowStep
                  num={2}
                  title="Column rules"
                  body="Pick from plain-English presets per column — validate format, transform values, check length."
                  active={subTab === 0 && totalRulesCount > 0}
                />
                <WorkflowStep
                  num={3}
                  title="Review & export"
                  body="Run rules, inspect Cleaned vs. Rejected rows, then download the CSVs."
                  active={subTab === 2}
                />
              </Stack>
            </Box>
            <Button size="small" onClick={dismissBanner}>Hide</Button>
          </Box>
        </Paper>
      )}

      {/* Sub-Tab Navigation */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs
          value={subTab}
          onChange={(_, v) => setSubTab(v)}
          variant="fullWidth"
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tab icon={<SettingsIcon />} label="Rule Configuration" iconPosition="start" />
          <Tab icon={<AutoFixHighIcon />} label="Standardization" iconPosition="start" />
          <Tab
            icon={<VisibilityIcon />}
            label={`Results Preview${runSummary ? ` (${runSummary.total_processed} rows)` : ''}`}
            iconPosition="start"
            disabled={!runSummary}
          />
        </Tabs>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* ====== Sub-Tab 0: Rule Configuration ====== */}
      {subTab === 0 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Data Quality Rule Configuration
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Build rules from plain-English presets — no regex required. Each rule either{' '}
            <Box component="span" sx={{ color: KIND_META.transform.color, fontWeight: 600 }}>transforms</Box>,{' '}
            <Box component="span" sx={{ color: KIND_META.validate.color, fontWeight: 600 }}>validates</Box>, or{' '}
            <Box component="span" sx={{ color: KIND_META.length.color, fontWeight: 600 }}>length-checks</Box> a column.
          </Typography>

          {/* Summary bar */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={4}>
              <Card variant="outlined" sx={{ textAlign: 'center' }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Columns</Typography>
                  <Typography variant="h5" fontWeight="bold">{columns.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card variant="outlined" sx={{ textAlign: 'center' }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Total Rules</Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">{totalRulesCount}</Typography>
                  {columnsWithRules > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      across {columnsWithRules} {columnsWithRules === 1 ? 'column' : 'columns'}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card variant="outlined" sx={{ textAlign: 'center' }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Typography variant="h5" fontWeight="bold" color={runSummary ? 'success.main' : 'text.disabled'}>
                    {runSummary ? 'Done' : 'Pending'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Library & Auto-Fix */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={7}>
              <Box sx={{
                p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1a1f2e' : '#f8fafc',
                height: '100%',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <BookmarkIcon sx={{ color: '#6366f1', mr: 1 }} />
                    <Typography variant="subtitle2" fontWeight="bold">Rule Library</Typography>
                  </Box>
                  <Button size="small" startIcon={<SaveIcon />} onClick={() => setSaveOpen(!saveOpen)}>
                    Save as Template
                  </Button>
                </Box>

                {saveOpen && (
                  <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                    <TextField
                      size="small" fullWidth label="Template Name"
                      value={newRuleSetName} onChange={(e) => setNewRuleSetName(e.target.value)}
                    />
                    <Button variant="contained" size="small" onClick={handleSaveRuleSet}>Save</Button>
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {ruleSets.length === 0 && (
                    <Typography variant="caption" color="text.disabled">No saved templates yet.</Typography>
                  )}
                  {ruleSets.map((lib) => (
                    <Chip
                      key={lib.id}
                      label={lib.name}
                      variant="outlined"
                      clickable
                      icon={<CloudDownloadIcon />}
                      onClick={() => handleLoadRuleSet(lib.rules_json)}
                      onDelete={async () => {
                        if (window.confirm(`Delete ${lib.name}?`)) {
                          try {
                            await client.delete(`/rules/${lib.id}`);
                            loadRuleSets();
                            toast.success(`Deleted "${lib.name}"`);
                          } catch (err: any) {
                            toast.error('Failed to delete template');
                          }
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={5}>
              <Box sx={{
                p: 2, border: '1px solid #fecaca', borderRadius: 2, bgcolor: '#fef2f2',
                height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" color="#b60003" gutterBottom>
                    Intelligent Auto-Fix
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    One-click cleanup of duplicates, missing values, whitespace and column names.
                  </Typography>
                  <Typography variant="caption" sx={{
                    display: 'block', mb: 1.5, fontWeight: 600, color: '#7f1d1d',
                  }}>
                    You will review every change before it is written to the source data.
                  </Typography>
                </Box>
                <Button
                  fullWidth variant="contained" startIcon={<AutoFixHighIcon />}
                  onClick={openAutoFixPreview}
                  sx={{ bgcolor: '#b60003', '&:hover': { bgcolor: '#8f0002' } }}
                >
                  Preview Auto-Fix
                </Button>
              </Box>
            </Grid>
          </Grid>

          {/* AI Helper Bar */}
          <Box sx={{
            p: 2, mb: 4, border: '1px solid #bae6fd', borderRadius: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#0c2030' : '#f0f9ff',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AutoAwesomeIcon sx={{ color: '#0284c7', mr: 1 }} />
              <Typography variant="subtitle2" color="#0369a1" fontWeight="bold">AI Rule Assistant</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                — describe a rule in your own words and we'll add it.
              </Typography>
            </Box>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Column</InputLabel>
                  <Select value={aiCol} label="Column" onChange={(e) => setAiCol(e.target.value)}>
                    {columns.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={7}>
                <TextField
                  fullWidth size="small"
                  placeholder="e.g. 'Remove symbols', 'Format as Title Case', 'Check if valid email'"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAiSuggest()}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  fullWidth variant="contained" color="info" size="small"
                  onClick={handleAiSuggest}
                  disabled={aiSuggesting || !aiCol || !aiPrompt}
                >
                  {aiSuggesting ? <CircularProgress size={20} /> : 'Suggest'}
                </Button>
              </Grid>
            </Grid>
          </Box>

          {/* Column accordions with friendly rule chips */}
          <Box sx={{ maxHeight: '50vh', overflowY: 'auto', mb: 4, pr: 1 }}>
            {columns.map((col) => {
              const colRules = rulesConfig[col] || [];
              return (
                <Accordion key={col} sx={{ mb: 1, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                      <Typography sx={{ fontWeight: 600, minWidth: '30%' }}>{col}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{
                        flex: 1, fontStyle: 'italic',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        Sample: {samples[col]?.slice(0, 2).join(', ')}…
                      </Typography>
                      <Typography sx={{
                        color: colRules.length > 0 ? 'primary.main' : 'text.disabled',
                        fontWeight: 'bold', whiteSpace: 'nowrap',
                      }}>
                        {colRules.length} {colRules.length === 1 ? 'Rule' : 'Rules'}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ bgcolor: 'action.hover', pt: 2 }}>
                    {colRules.length === 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        No rules yet. Add one to validate, transform, or check the length of values in this column.
                      </Typography>
                    )}
                    {colRules.map((rule, idx) => {
                      const kind = ruleKind(rule);
                      const km = KIND_META[kind];
                      return (
                        <Box key={idx} sx={{
                          display: 'flex', alignItems: 'center', gap: 2, mb: 1, p: 1.5,
                          bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                          borderRadius: 1,
                        }}>
                          <Chip
                            label={km.label}
                            size="small"
                            sx={{
                              bgcolor: km.bg, color: km.color, fontWeight: 700,
                              fontSize: '0.7rem', height: 22, minWidth: 80,
                            }}
                          />
                          <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                            {summarizeRule(rule)}
                          </Typography>
                          <IconButton size="small" color="error" onClick={() => deleteRule(col, idx)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      );
                    })}
                    <Button
                      startIcon={<AddIcon />}
                      variant="outlined"
                      size="small"
                      onClick={() => openRulePicker(col)}
                      sx={{ mt: 0.5 }}
                    >
                      Add Rule
                    </Button>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>

          <Button
            variant="contained"
            size="large"
            startIcon={running ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
            onClick={runQuality}
            disabled={running || totalRulesCount === 0}
            sx={{ px: 4 }}
          >
            {running ? 'Executing...' : 'Run Rules'}
          </Button>
          {totalRulesCount === 0 && (
            <Typography variant="caption" color="text.disabled" sx={{ ml: 2 }}>
              Add at least one rule to enable execution.
            </Typography>
          )}
        </Paper>
      )}

      {/* ====== Sub-Tab 1: Standardization ====== */}
      {subTab === 1 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Text Standardization
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Apply professional formatting and case styles across multiple columns at once.
          </Typography>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Select Columns</Typography>
              <Box sx={{
                maxHeight: 300, overflowY: 'auto', p: 2, border: '1px solid', borderColor: 'divider',
                borderRadius: 2, display: 'flex', flexWrap: 'wrap', gap: 1,
              }}>
                {columns.map((col) => (
                  <Chip
                    key={col}
                    label={col}
                    color={standardizeCols.includes(col) ? 'primary' : 'default'}
                    onClick={() => {
                      if (standardizeCols.includes(col)) {
                        setStandardizeCols(standardizeCols.filter((c) => c !== col));
                      } else {
                        setStandardizeCols([...standardizeCols, col]);
                      }
                    }}
                    variant={standardizeCols.includes(col) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
              <Box sx={{ mt: 1 }}>
                <Button size="small" onClick={() => setStandardizeCols(columns)}>Select All</Button>
                <Button size="small" onClick={() => setStandardizeCols([])}>Clear</Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Transformation Settings</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Case Style</InputLabel>
                  <Select value={standardizeCase} label="Case Style" onChange={(e) => setStandardizeCase(e.target.value)}>
                    <MenuItem value="lower">lowercase</MenuItem>
                    <MenuItem value="upper">UPPERCASE</MenuItem>
                    <MenuItem value="title">Title Case (Professional)</MenuItem>
                    <MenuItem value="sentence">Sentence case</MenuItem>
                    <MenuItem value="capitalize">Capitalize first letter</MenuItem>
                  </Select>
                </FormControl>

                {(standardizeCase === 'title') && (
                  <FormControl fullWidth>
                    <InputLabel>Title Style</InputLabel>
                    <Select value={standardizeStyle} label="Title Style" onChange={(e) => setStandardizeStyle(e.target.value)}>
                      <MenuItem value="apa">APA (Standard)</MenuItem>
                      <MenuItem value="chicago">Chicago Style</MenuItem>
                    </Select>
                  </FormControl>
                )}

                <Button
                  variant="contained"
                  size="large"
                  onClick={handleStandardize}
                  disabled={standardizing || standardizeCols.length === 0}
                  startIcon={standardizing ? <CircularProgress size={20} /> : <AutoFixHighIcon />}
                >
                  Apply Standardization
                </Button>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" fontWeight="bold" gutterBottom>Column Name Standardization</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Rename all column headers to a consistent naming convention. Modifies the dataset file directly.
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Naming Convention</InputLabel>
                <Select value={colNameStyle} label="Naming Convention" onChange={(e) => setColNameStyle(e.target.value)}>
                  <MenuItem value="snake_case">snake_case — first_name</MenuItem>
                  <MenuItem value="camelCase">camelCase — firstName</MenuItem>
                  <MenuItem value="PascalCase">PascalCase — FirstName</MenuItem>
                  <MenuItem value="kebab-case">kebab-case — first-name</MenuItem>
                  <MenuItem value="lower">lower — firstname</MenuItem>
                  <MenuItem value="upper">UPPER — FIRSTNAME</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                onClick={handleStandardizeColumns}
                disabled={standardizingColNames}
                startIcon={standardizingColNames ? <CircularProgress size={20} color="inherit" /> : <AutoFixHighIcon />}
              >
                Apply to Column Names
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ====== Sub-Tab 2: Results Preview ====== */}
      {subTab === 2 && runSummary && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h5" fontWeight="bold">Results Preview</Typography>
              <Typography variant="body2" color="text.secondary">
                Processed {runSummary.total_processed} rows. Found {runSummary.total_rejected} rejections.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<DownloadIcon />}
                variant="outlined"
                size="small"
                onClick={() => downloadFile('cleaned')}
              >
                Cleaned CSV
              </Button>
              {runSummary.total_rejected > 0 && (
                <Button
                  startIcon={<DownloadIcon />}
                  variant="outlined"
                  size="small"
                  color="error"
                  onClick={() => downloadFile('rejected')}
                >
                  Rejected CSV
                </Button>
              )}
            </Box>
          </Box>

          {/* KPI Summary Bar */}
          {runSummary && (() => {
            const passed = runSummary.total_processed - runSummary.total_rejected;
            const failed = runSummary.total_rejected;
            return (
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                {[
                  { label: 'Total Checks', value: runSummary.total_processed, color: '#6b7280', bg: '#f1f5f9' },
                  { label: 'Passed', value: passed, color: '#16a34a', bg: '#f0fdf4' },
                  { label: 'Failed', value: failed, color: '#dc2626', bg: '#fef2f2' },
                  { label: 'Warnings', value: 0, color: '#d97706', bg: '#fffbeb' },
                ].map((kpi) => (
                  <Chip
                    key={kpi.label}
                    label={`${kpi.value} ${kpi.label}`}
                    sx={{ bgcolor: kpi.bg, color: kpi.color, fontWeight: 700, fontSize: '0.8rem', height: 36, px: 1 }}
                  />
                ))}
              </Box>
            );
          })()}

          {/* Summary cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={4}>
              <Card variant="outlined" sx={{ textAlign: 'center', borderTop: '3px solid #047857' }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Total Processed</Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">{runSummary.total_processed}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card variant="outlined" sx={{ textAlign: 'center', borderTop: '3px solid #1976d2' }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Cleaned Rows</Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">{runSummary.total_processed - runSummary.total_rejected}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card variant="outlined" sx={{ textAlign: 'center', borderTop: '3px solid #b91c1c' }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Rejected Rows</Typography>
                  <Typography variant="h5" fontWeight="bold" color="error">{runSummary.total_rejected}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Tabs value={previewTab} onChange={(_, val) => setPreviewTab(val)} sx={{ mb: 2 }}>
            <Tab icon={<VisibilityIcon />} label="Cleaned Data" iconPosition="start" />
            <Tab
              icon={<VisibilityIcon />}
              label={`Rejected Data (${runSummary.total_rejected})`}
              iconPosition="start"
              disabled={runSummary.total_rejected === 0}
            />
          </Tabs>

          <Box sx={{ height: 400, width: '100%', bgcolor: 'background.paper' }}>
            {previewLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <DataGrid
                rows={previewData.rows}
                columns={gridColumns}
                density="compact"
                disableRowSelectionOnClick
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                pageSizeOptions={[10, 25, 50]}
              />
            )}
          </Box>
        </Paper>
      )}

      {/* Rule picker dialog */}
      <RulePicker
        open={pickerOpen}
        column={pickerColumn}
        onClose={() => setPickerOpen(false)}
        onAdd={handlePickerAdd}
      />

      {/* Auto-Fix preview-then-approve dialog */}
      <AutoFixPreview
        open={autoFixOpen}
        loading={autoFixLoading}
        applying={autoFixApplying}
        preview={autoFixData}
        operations={autoFixOps}
        onClose={() => setAutoFixOpen(false)}
        onApply={applyAutoFix}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Workflow step pill (used in the banner)
// ---------------------------------------------------------------------------

interface WorkflowStepProps {
  num: number;
  title: string;
  body: string;
  active?: boolean;
}

function WorkflowStep({ num, title, body, active }: WorkflowStepProps) {
  return (
    <Box sx={{
      flex: 1, p: 1.5, borderRadius: 1.5,
      border: '1px solid',
      borderColor: active ? '#b60003' : 'divider',
      bgcolor: active ? 'rgba(182, 0, 3, 0.04)' : 'transparent',
      display: 'flex', gap: 1.5, alignItems: 'flex-start',
    }}>
      <Box sx={{
        width: 24, height: 24, borderRadius: '50%',
        bgcolor: active ? '#b60003' : 'action.disabledBackground',
        color: active ? 'white' : 'text.secondary',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
      }}>
        {num}
      </Box>
      <Box>
        <Typography variant="caption" fontWeight={700} sx={{ display: 'block' }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
          {body}
        </Typography>
      </Box>
    </Box>
  );
}
