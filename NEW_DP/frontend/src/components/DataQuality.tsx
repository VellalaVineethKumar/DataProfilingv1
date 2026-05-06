import { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Paper, Accordion, AccordionSummary, AccordionDetails,
  Select, MenuItem, FormControl, InputLabel, TextField, IconButton, Alert, CircularProgress,
  Divider, Tabs, Tab, Card, CardContent, Grid, Chip
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
import client from '../api/client';

interface Rule {
  mode: string;
  pattern: string;
  replace: string;
  case: string;
  length_mode: string;
  min_length: number;
  max_length: number;
  exact_length: number;
}

export default function DataQuality() {
  const currentDataset = useStore((state) => state.dataset);
  const [subTab, setSubTab] = useState(0);

  const [columns, setColumns] = useState<string[]>([]);
  const [samples, setSamples] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [rulesConfig, setRulesConfig] = useState<Record<string, Rule[]>>({});
  const [running, setRunning] = useState(false);
  const [runSummary, setRunSummary] = useState<any>(null);

  // AI Suggestion state
  const [aiCol, setAiCol] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggesting, setAiSuggesting] = useState(false);

  // Preview state
  const [previewTab, setPreviewTab] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{columns: string[], rows: any[]}>({columns: [], rows: []});

  // Rule Library state
  const [ruleSets, setRuleSets] = useState<any[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [newRuleSetName, setNewRuleSetName] = useState('');
  const [autoFixing, setAutoFixing] = useState(false);

  // Standardization state
  const [standardizeCols, setStandardizeCols] = useState<string[]>([]);
  const [standardizeCase, setStandardizeCase] = useState('lower');
  const [standardizeStyle, setStandardizeStyle] = useState('apa');
  const [standardizing, setStandardizing] = useState(false);

  // Column name standardization
  const [colNameStyle, setColNameStyle] = useState('snake_case');
  const [standardizingColNames, setStandardizingColNames] = useState(false);

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
      res.data.columns.forEach((c: string) => {
        initialConfig[c] = [];
      });
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
        rules_json: JSON.stringify(rulesConfig)
      });
      setNewRuleSetName('');
      setSaveOpen(false);
      loadRuleSets();
      alert('Template saved to library!');
    } catch (err: any) {
      alert('Failed to save template: ' + (err?.response?.data?.detail || err.message));
    }
  };

  const handleLoadRuleSet = (rulesJson: string) => {
    try {
      const loaded = JSON.parse(rulesJson);
      // Merge logic - prioritize loaded rules
      setRulesConfig({ ...rulesConfig, ...loaded });
      alert('Template applied successfully!');
    } catch (err) {
      alert('Failed to parse template rules.');
    }
  };

  const handleAutoFix = async () => {
    if (!currentDataset || !window.confirm("Auto-Fix will modify the dataset file directly (standardizing names, trimming, and filling missing values). Proceed?")) return;
    try {
      setAutoFixing(true);
      const res = await client.post(`/quality/auto-fix/${currentDataset.id}`);
      alert(res.data.message + "\n\nActions:\n- " + res.data.operations.join("\n- "));
      // Reload everything since columns might have changed names
      window.location.reload(); 
    } catch (err: any) {
      alert('Auto-fix failed: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setAutoFixing(false);
    }
  };

  const downloadFile = async (type: 'cleaned' | 'rejected') => {
    if (!currentDataset) return;
    try {
      const res = await client.get(`/quality/download/${currentDataset.id}?type=${type}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${currentDataset.filename}_${type}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download file.');
    }
  };

  const addRule = (colName: string) => {
    const newRule: Rule = {
      mode: 'Clean', pattern: '', replace: '', case: 'UPPERCASE',
      length_mode: 'Exact', min_length: 0, max_length: 50, exact_length: 10
    };
    setRulesConfig({
      ...rulesConfig,
      [colName]: [...rulesConfig[colName], newRule]
    });
  };

  const updateRule = (colName: string, ruleIndex: number, field: keyof Rule, value: any) => {
    const colRules = [...rulesConfig[colName]];
    colRules[ruleIndex] = { ...colRules[ruleIndex], [field]: value };
    setRulesConfig({
      ...rulesConfig,
      [colName]: colRules
    });
  };

  const deleteRule = (colName: string, ruleIndex: number) => {
    const colRules = [...rulesConfig[colName]];
    colRules.splice(ruleIndex, 1);
    setRulesConfig({
      ...rulesConfig,
      [colName]: colRules
    });
  };

  const runQuality = async () => {
    try {
      setRunning(true);
      setError('');
      setRunSummary(null);
      const res = await client.post(`/quality/run/${currentDataset?.id}`, {
        rules: rulesConfig
      });
      setRunSummary(res.data);
      setSubTab(1); // Auto-switch to results
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
        prompt: aiPrompt
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
        exact_length: suggestion.exact_length || 10
      };
      
      setRulesConfig({
        ...rulesConfig,
        [aiCol]: [...(rulesConfig[aiCol] || []), newRule]
      });
      setAiPrompt('');
      alert(`AI added rule: ${suggestion.explanation}`);
    } catch (err: any) {
      alert('AI suggestion failed: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleStandardize = async () => {
    if (standardizeCols.length === 0) {
      alert("Please select at least one column");
      return;
    }
    try {
      setStandardizing(true);
      const res = await client.post(`/quality/standardize-text/${currentDataset?.id}`, {
        columns: standardizeCols,
      }, {
        params: {
          case: standardizeCase,
          style: standardizeStyle
        }
      });
      alert(res.data.message);
      loadColumns();
    } catch (err: any) {
      alert('Standardization failed: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setStandardizing(false);
    }
  };

  const handleStandardizeColumns = async () => {
    if (!currentDataset) return;
    try {
      setStandardizingColNames(true);
      const res = await client.post(`/quality/standardize-columns/${currentDataset.id}`, null, {
        params: { case_type: colNameStyle }
      });
      const preview = res.data.columns.slice(0, 5).join(', ') + (res.data.columns.length > 5 ? '…' : '');
      alert(`${res.data.message}\n\nNew names: ${preview}`);
      window.location.reload();
    } catch (err: any) {
      alert('Column rename failed: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setStandardizingColNames(false);
    }
  };

  const gridColumns: GridColDef[] = previewData.columns.map(col => ({
    field: col,
    headerName: col,
    width: 150,
    editable: false,
  }));

  const totalRulesCount = Object.values(rulesConfig).reduce((sum, rules) => sum + rules.length, 0);

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
      {/* Sub-Tab Navigation */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs
          value={subTab}
          onChange={(_, v) => setSubTab(v)}
          variant="fullWidth"
          sx={{ borderBottom: '1px solid #e0e0e0' }}
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

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* ====== Sub-Tab 0: Rule Configuration ====== */}
      {subTab === 0 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Data Quality Rule Configuration
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Define transformation and validation rules per column, then execute to produce cleaned/rejected datasets.
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

          {/* Library & Quick Fix Utilities */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={7}>
              <Box sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#f8fafc' }}>
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

                <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                  {ruleSets.length === 0 && <Typography variant="caption" color="text.disabled">No saved templates yet.</Typography>}
                  {ruleSets.map(lib => (
                    <Chip 
                      key={lib.id} 
                      label={lib.name} 
                      variant="outlined" 
                      clickable 
                      icon={<CloudDownloadIcon />}
                      onClick={() => handleLoadRuleSet(lib.rules_json)}
                      onDelete={async () => {
                         if(window.confirm(`Delete ${lib.name}?`)) {
                           await client.delete(`/rules/${lib.id}`);
                           loadRuleSets();
                         }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={5}>
              <Box sx={{ p: 2, border: '1px solid #fecaca', borderRadius: 2, bgcolor: '#fef2f2', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="subtitle2" fontWeight="bold" color="#b60003" gutterBottom>
                  Intelligent Auto-Fix
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                  One-click cleanup: Standardization, Deduplication, and Imputation.
                </Typography>
                <Button
                  fullWidth variant="contained" startIcon={<AutoFixHighIcon />}
                  onClick={handleAutoFix} disabled={autoFixing}
                  sx={{ bgcolor: '#b60003', '&:hover': { bgcolor: '#8f0002' } }}
                >
                  {autoFixing ? 'Fixing...' : 'Run Auto-Fix'}
                </Button>
              </Box>
            </Grid>
          </Grid>

          {/* AI Helper Bar */}
          <Box sx={{ p: 2, mb: 4, bgcolor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AutoAwesomeIcon sx={{ color: '#0284c7', mr: 1 }} />
              <Typography variant="subtitle2" color="#0369a1" fontWeight="bold">AI Rule Assistant</Typography>
            </Box>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Column</InputLabel>
                  <Select value={aiCol} label="Column" onChange={(e) => setAiCol(e.target.value)}>
                    {columns.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
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

          <Box sx={{ maxHeight: '45vh', overflowY: 'auto', mb: 4, pr: 1 }}>
            {columns.map(col => (
              <Accordion key={col} sx={{ mb: 1, border: '1px solid #eee', boxShadow: 'none' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Typography sx={{ fontWeight: 600, width: '40%' }}>{col}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ width: '40%', fontStyle: 'italic' }}>
                      Sample: {samples[col]?.slice(0, 2).join(', ')}...
                    </Typography>
                    <Typography sx={{ color: rulesConfig[col]?.length > 0 ? 'primary.main' : 'text.disabled', fontWeight: 'bold' }}>
                      {rulesConfig[col]?.length || 0} Rules
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: 'grey.50' }}>
                  {rulesConfig[col]?.map((rule, idx) => (
                    <Box key={idx} sx={{
                      display: 'flex', alignItems: 'center', gap: 2, mb: 1, p: 2,
                      bgcolor: 'white', border: '1px solid #e0e0e0', borderRadius: 1
                    }}>
                      <FormControl size="small" sx={{ width: 140 }}>
                        <InputLabel>Mode</InputLabel>
                        <Select
                          value={rule.mode}
                          label="Mode"
                          onChange={(e) => updateRule(col, idx, 'mode', e.target.value)}
                        >
                          <MenuItem value="Clean">Clean (Regex Remove)</MenuItem>
                          <MenuItem value="Replace">Replace (Regex)</MenuItem>
                          <MenuItem value="Extract">Extract (Regex)</MenuItem>
                          <MenuItem value="Validate">Validate (Regex)</MenuItem>
                          <MenuItem value="Case">Change Case</MenuItem>
                          <MenuItem value="Length">Length Check</MenuItem>
                        </Select>
                      </FormControl>

                      {['Clean', 'Replace', 'Extract', 'Validate'].includes(rule.mode) && (
                        <TextField size="small" label="Pattern" value={rule.pattern} onChange={(e) => updateRule(col, idx, 'pattern', e.target.value)} placeholder="[0-9]+" />
                      )}
                      {rule.mode === 'Replace' && (
                        <TextField size="small" label="To" value={rule.replace} onChange={(e) => updateRule(col, idx, 'replace', e.target.value)} />
                      )}
                      {rule.mode === 'Case' && (
                        <Select size="small" value={rule.case} onChange={(e) => updateRule(col, idx, 'case', e.target.value)}>
                          <MenuItem value="UPPERCASE">UPPERCASE</MenuItem>
                          <MenuItem value="lowercase">lowercase</MenuItem>
                          <MenuItem value="Title Case">Title Case</MenuItem>
                        </Select>
                      )}
                      {rule.mode === 'Length' && (
                        <>
                          <Select size="small" value={rule.length_mode} onChange={(e) => updateRule(col, idx, 'length_mode', e.target.value)}>
                            <MenuItem value="Exact">Exact</MenuItem>
                            <MenuItem value="Minimum">Min</MenuItem>
                            <MenuItem value="Maximum">Max</MenuItem>
                            <MenuItem value="Range">Range</MenuItem>
                          </Select>
                          {rule.length_mode === 'Exact' && <TextField type="number" size="small" label="Len" value={rule.exact_length} onChange={(e) => updateRule(col, idx, 'exact_length', parseInt(e.target.value))} sx={{ width: 70 }}/>}
                          {['Minimum', 'Range'].includes(rule.length_mode) && <TextField type="number" size="small" label="Min" value={rule.min_length} onChange={(e) => updateRule(col, idx, 'min_length', parseInt(e.target.value))} sx={{ width: 70 }}/>}
                          {['Maximum', 'Range'].includes(rule.length_mode) && <TextField type="number" size="small" label="Max" value={rule.max_length} onChange={(e) => updateRule(col, idx, 'max_length', parseInt(e.target.value))} sx={{ width: 70 }}/>}
                        </>
                      )}

                      <IconButton size="small" color="error" onClick={() => deleteRule(col, idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Button startIcon={<AddIcon />} variant="text" size="small" onClick={() => addRule(col)}>
                    Add Rule
                  </Button>
                </AccordionDetails>
              </Accordion>
            ))}
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
                maxHeight: 300, overflowY: 'auto', p: 2, border: '1px solid #e2e8f0', 
                borderRadius: 2, display: 'flex', flexWrap: 'wrap', gap: 1 
              }}>
                {columns.map(col => (
                  <Chip 
                    key={col} 
                    label={col} 
                    color={standardizeCols.includes(col) ? "primary" : "default"}
                    onClick={() => {
                      if (standardizeCols.includes(col)) {
                        setStandardizeCols(standardizeCols.filter(c => c !== col));
                      } else {
                        setStandardizeCols([...standardizeCols, col]);
                      }
                    }}
                    variant={standardizeCols.includes(col) ? "filled" : "outlined"}
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
            const warned = 0;
            return (
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                {[
                  { label: 'Total Checks', value: runSummary.total_processed, color: '#6b7280', bg: '#f1f5f9' },
                  { label: 'Passed', value: passed, color: '#16a34a', bg: '#f0fdf4' },
                  { label: 'Failed', value: failed, color: '#dc2626', bg: '#fef2f2' },
                  { label: 'Warnings', value: warned, color: '#d97706', bg: '#fffbeb' },
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
            <Tab icon={<VisibilityIcon />} label={`Rejected Data (${runSummary.total_rejected})`} iconPosition="start" disabled={runSummary.total_rejected === 0} />
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
                initialState={{
                  pagination: { paginationModel: { pageSize: 10 } },
                }}
                pageSizeOptions={[10, 25, 50]}
              />
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );
}
