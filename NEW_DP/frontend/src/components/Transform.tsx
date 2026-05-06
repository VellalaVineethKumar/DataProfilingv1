import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Alert, CircularProgress, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Select, MenuItem, TextField, FormControl, InputLabel, Divider,
  Grid, Card, CardContent, Drawer
} from '@mui/material';
import {
  AutoFixHigh as AutoFixIcon,
  CleaningServices as CleanIcon,
  TextFields as TextIcon,
  Numbers as NumbersIcon,
  TableRows as TableRowsIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import client from '../api/client';
import { useStore } from '../store';

interface TransformSummary {
  rows_before: number;
  rows_after: number;
  rows_removed: number;
  cols_before: number;
  cols_after: number;
  nulls_before: number;
  nulls_after: number;
}

interface PreviewData {
  columns: string[];
  rows: Record<string, string>[];
  total_rows: number;
  dtypes: Record<string, string>;
  null_counts: Record<string, number>;
}

const OPERATIONS = [
  {
    id: 'auto_fix',
    label: 'Auto-Fix All',
    description: 'Remove duplicates, fill nulls, clean text, standardize column names',
    icon: <AutoFixIcon />,
    color: '#7c3aed',
    params: [],
  },
  {
    id: 'trim_whitespace',
    label: 'Trim Whitespace',
    description: 'Strip leading/trailing whitespace from all text columns',
    icon: <CleanIcon />,
    color: '#0369a1',
    params: [],
  },
  {
    id: 'clean_special_chars',
    label: 'Clean Special Characters',
    description: 'Normalize unicode, remove control chars, fix smart quotes',
    icon: <CleanIcon />,
    color: '#0891b2',
    params: [],
  },
  {
    id: 'remove_exact_duplicates',
    label: 'Remove Exact Duplicates',
    description: 'Drop exact duplicate rows',
    icon: <TableRowsIcon />,
    color: '#b91c1c',
    params: [{ name: 'keep', label: 'Keep', type: 'select', options: ['first', 'last', 'none'], default: 'first' }],
  },
  {
    id: 'handle_missing',
    label: 'Handle Missing Values',
    description: 'Fill or drop null values using a chosen strategy',
    icon: <CleanIcon />,
    color: '#d97706',
    params: [{ name: 'strategy', label: 'Strategy', type: 'select', options: ['auto', 'mean', 'median', 'mode', 'constant', 'drop'], default: 'auto' }],
  },
  {
    id: 'standardize_columns',
    label: 'Standardize Column Names',
    description: 'Rename all columns to a consistent naming style',
    icon: <TextIcon />,
    color: '#059669',
    params: [{ name: 'case', label: 'Style', type: 'select', options: ['snake_case', 'camelCase', 'PascalCase', 'lower', 'upper', 'kebab-case'], default: 'snake_case' }],
  },
  {
    id: 'standardize_text',
    label: 'Standardize Text Case',
    description: 'Convert text in selected columns to a consistent case',
    icon: <TextIcon />,
    color: '#2563eb',
    params: [
      { name: 'case', label: 'Case', type: 'select', options: ['lower', 'upper', 'title', 'sentence', 'capitalize'], default: 'lower' },
      { name: 'columns', label: 'Columns (comma-separated)', type: 'text', default: '' },
    ],
  },
  {
    id: 'remove_outliers',
    label: 'Remove Outliers',
    description: 'Drop rows with extreme values in numeric columns',
    icon: <NumbersIcon />,
    color: '#dc2626',
    params: [{ name: 'method', label: 'Method', type: 'select', options: ['iqr', 'zscore'], default: 'iqr' }],
  },
  {
    id: 'apply_regex',
    label: 'Apply Regex',
    description: 'Apply a regex pattern to a specific column',
    icon: <CodeIcon />,
    color: '#7c3aed',
    params: [
      { name: 'column', label: 'Column', type: 'text', default: '' },
      { name: 'pattern', label: 'Pattern', type: 'text', default: '' },
      { name: 'replacement', label: 'Replacement', type: 'text', default: '' },
      { name: 'action', label: 'Action', type: 'select', options: ['replace', 'extract', 'filter'], default: 'replace' },
    ],
  },
];

export default function Transform() {
  const dataset = useStore((state) => state.dataset);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; summary: TransformSummary } | null>(null);
  const [error, setError] = useState('');
  const [paramValues, setParamValues] = useState<Record<string, Record<string, string>>>({});
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (dataset) loadPreview();
  }, [dataset]);

  const loadPreview = async () => {
    if (!dataset) return;
    try {
      const res = await client.get(`/transform/preview/${dataset.id}`);
      setPreview(res.data);
    } catch {
      // preview is optional
    }
  };

  const getParam = (opId: string, paramName: string, defaultVal: string) =>
    paramValues[opId]?.[paramName] ?? defaultVal;

  const setParam = (opId: string, paramName: string, value: string) => {
    setParamValues((prev) => ({
      ...prev,
      [opId]: { ...(prev[opId] ?? {}), [paramName]: value },
    }));
  };

  const buildParams = (op: typeof OPERATIONS[0]) => {
    const p: Record<string, unknown> = {};
    for (const param of op.params) {
      const val = getParam(op.id, param.name, param.default);
      if (param.name === 'columns') {
        p.columns = val ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];
      } else {
        p[param.name] = val;
      }
    }
    return p;
  };

  const applyOp = async (op: typeof OPERATIONS[0]) => {
    if (!dataset) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await client.post(`/transform/apply/${dataset.id}`, {
        operation: op.id,
        params: buildParams(op),
      });
      setResult({ message: res.data.message, summary: res.data.summary });
      await loadPreview();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Transform failed');
    } finally {
      setLoading(false);
    }
  };

  if (!dataset) {
    return <Alert severity="info" sx={{ m: 4 }}>Please load a dataset first.</Alert>;
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>Data Transformations</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Apply cleaning and transformation operations directly to your dataset. Each operation updates the stored file.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {result && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <strong>{result.message}</strong>
          <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip size="small" label={`Rows: ${result.summary.rows_before} → ${result.summary.rows_after}`} />
            <Chip size="small" label={`Removed: ${result.summary.rows_removed} rows`} color={result.summary.rows_removed > 0 ? 'warning' : 'default'} />
            <Chip size="small" label={`Nulls: ${result.summary.nulls_before} → ${result.summary.nulls_after}`} />
          </Box>
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {OPERATIONS.map((op) => (
          <Grid item xs={12} sm={6} md={4} key={op.id}>
            <Card
              variant="outlined"
              onClick={() => { setSelectedOperation(op.id); setDrawerOpen(true); }}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderTop: `3px solid ${op.color}`,
                cursor: 'pointer',
                border: '2px solid',
                borderColor: selectedOperation === op.id ? '#b60003' : 'divider',
                borderRadius: 2,
                transition: 'border-color 0.15s',
                '&:hover': { borderColor: '#b60003', bgcolor: '#fef2f2' },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ color: op.color }}>{op.icon}</Box>
                  <Typography variant="subtitle1" fontWeight={600}>{op.label}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{op.description}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: 360, p: 3 } } }}
      >
        {(() => {
          const op = OPERATIONS.find((o) => o.id === selectedOperation);
          if (!op) return null;
          return (
            <>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Configure Operation
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                {op.label}
              </Typography>
              <Box sx={{ mt: 2 }}>
                {op.params.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No parameters needed for this operation.
                  </Typography>
                )}
                {op.params.map((param) => (
                  <Box key={param.name} sx={{ mb: 2 }}>
                    {param.type === 'select' ? (
                      <FormControl fullWidth size="small">
                        <InputLabel>{param.label}</InputLabel>
                        <Select
                          label={param.label}
                          value={getParam(op.id, param.name, param.default)}
                          onChange={(e) => setParam(op.id, param.name, e.target.value)}
                        >
                          {param.options!.map((opt) => (
                            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <TextField
                        fullWidth
                        size="small"
                        label={param.label}
                        value={getParam(op.id, param.name, param.default)}
                        onChange={(e) => setParam(op.id, param.name, e.target.value)}
                      />
                    )}
                  </Box>
                ))}
              </Box>
              <Box sx={{ mt: 3 }}>
                <Button
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  onClick={() => { void applyOp(op); setDrawerOpen(false); }}
                  sx={{ bgcolor: '#b60003', '&:hover': { bgcolor: '#8f0002' } }}
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                  Apply Transform
                </Button>
              </Box>
            </>
          );
        })()}
      </Drawer>

      {preview && (
        <>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Current Data Preview
            <Chip size="small" label={`${preview.total_rows} rows × ${preview.columns.length} cols`} sx={{ ml: 1 }} />
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {preview.columns.map((col) => (
                    <TableCell key={col} sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>
                      <Box>
                        <Typography variant="caption" fontWeight={600}>{col}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {preview.dtypes[col]}
                          {preview.null_counts[col] > 0 && (
                            <span style={{ color: '#ef4444' }}> · {preview.null_counts[col]} null</span>
                          )}
                        </Typography>
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.rows.map((row, i) => (
                  <TableRow key={i} hover>
                    {preview.columns.map((col) => (
                      <TableCell key={col} sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row[col]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
