// frontend/src/components/dataQuality/AutoFixPreview.tsx
//
// Two-step modal:
//   1. Show what the auto-fix WOULD do (dry-run preview from backend).
//   2. Require an explicit "Apply changes" click before writing to source.
//
// User mandate: "you cannot write to the src data without a human reviewing it".

import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Chip, IconButton, CircularProgress,
  Alert, Divider, Collapse, Table, TableBody, TableCell,
  TableHead, TableRow, Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

export interface AutoFixPreviewData {
  duplicates_removed: number;
  missing_filled: { column: string; count: number; fill_value: string }[];
  whitespace_cleaned: { column: string; count: number; samples: { before: string; after: string }[] }[];
  columns_renamed: { old: string; new: string }[];
  total_rows_before: number;
  total_rows_after: number;
}

interface AutoFixPreviewProps {
  open: boolean;
  loading: boolean;          // true while fetching the dry-run
  applying: boolean;         // true while applying
  preview: AutoFixPreviewData | null;
  operations: string[];
  onClose: () => void;
  onApply: () => void;
}

interface SectionProps {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, count, defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <Box sx={{ mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Box
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={600}>{title}</Typography>
          <Chip label={count} size="small" color="primary" />
        </Box>
        {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>
      <Collapse in={open}>
        <Divider />
        <Box sx={{ p: 2 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}

export default function AutoFixPreview({
  open, loading, applying, preview, operations, onClose, onApply,
}: AutoFixPreviewProps) {
  const noChanges =
    preview &&
    preview.duplicates_removed === 0 &&
    preview.missing_filled.length === 0 &&
    preview.whitespace_cleaned.length === 0 &&
    preview.columns_renamed.length === 0;

  return (
    <Dialog open={open} onClose={applying ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <AutoFixHighIcon sx={{ color: '#b60003' }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700}>Auto-Fix preview</Typography>
          <Typography variant="caption" color="text.secondary">
            Review every change below before it is written to your dataset.
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} disabled={applying}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: 320 }}>
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Analyzing your dataset…
            </Typography>
          </Box>
        )}

        {!loading && preview && (
          <>
            <Alert
              severity={noChanges ? 'success' : 'warning'}
              icon={noChanges ? <CheckCircleOutlineIcon /> : <WarningAmberIcon />}
              sx={{ mb: 2 }}
            >
              {noChanges ? (
                <>
                  Your dataset already looks clean. No changes are needed.
                </>
              ) : (
                <>
                  <strong>This will modify your source dataset.</strong> Nothing has been written yet —
                  click <strong>Apply changes</strong> to commit, or <strong>Cancel</strong> to discard.
                </>
              )}
            </Alert>

            {/* Top-level operation summary */}
            {operations.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Summary
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {operations.map((op, i) => (
                    <Typography component="li" variant="body2" key={i} sx={{ mb: 0.25 }}>
                      {op}
                    </Typography>
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Rows: {preview.total_rows_before.toLocaleString()} → {preview.total_rows_after.toLocaleString()}
                </Typography>
              </Paper>
            )}

            {/* Detailed sections */}
            <Section
              title="Duplicate rows removed"
              count={preview.duplicates_removed}
              defaultOpen
            >
              <Typography variant="body2" color="text.secondary">
                {preview.duplicates_removed.toLocaleString()} duplicate rows will be deleted (first
                occurrence is kept).
              </Typography>
            </Section>

            <Section
              title="Missing values filled"
              count={preview.missing_filled.length}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Column</TableCell>
                    <TableCell align="right">Rows</TableCell>
                    <TableCell>Fill value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.missing_filled.map((m) => (
                    <TableRow key={m.column}>
                      <TableCell sx={{ fontWeight: 500 }}>{m.column}</TableCell>
                      <TableCell align="right">{m.count.toLocaleString()}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {m.fill_value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>

            <Section
              title="Whitespace / accents cleaned"
              count={preview.whitespace_cleaned.length}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {preview.whitespace_cleaned.map((w) => (
                  <Box key={w.column}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      {w.column}{' '}
                      <Typography component="span" variant="caption" color="text.secondary">
                        ({w.count.toLocaleString()} cells)
                      </Typography>
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Before</TableCell>
                          <TableCell>After</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {w.samples.map((s, i) => (
                          <TableRow key={i}>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.secondary' }}>
                              {s.before || <em>(empty)</em>}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                              {s.after || <em>(empty)</em>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                ))}
              </Box>
            </Section>

            <Section
              title="Columns renamed to snake_case"
              count={preview.columns_renamed.length}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Old name</TableCell>
                    <TableCell>New name</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.columns_renamed.map((c) => (
                    <TableRow key={c.old}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.secondary' }}>
                        {c.old}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>
                        {c.new}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={applying}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onApply}
          disabled={loading || applying || !preview || !!noChanges}
          startIcon={applying ? <CircularProgress size={16} color="inherit" /> : <AutoFixHighIcon />}
          sx={{ bgcolor: '#b60003', '&:hover': { bgcolor: '#8f0002' } }}
        >
          {applying ? 'Applying…' : 'Apply changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
