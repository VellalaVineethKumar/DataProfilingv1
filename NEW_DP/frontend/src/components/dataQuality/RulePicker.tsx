// frontend/src/components/dataQuality/RulePicker.tsx
//
// Plain-English rule picker. Opens as a dialog when the user clicks "Add Rule".
// They browse presets by category ("Clean Up", "Validate", "Format", "Length"),
// optionally fill in any required parameters, and click Add.

import { useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Tabs, Tab, TextField, Button, Chip,
  IconButton, InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  PRESETS_BY_KIND, KIND_META, type Rule, type RuleKind, type RulePreset,
} from './rulePresets';

interface RulePickerProps {
  open: boolean;
  column: string;
  onClose: () => void;
  onAdd: (rule: Rule) => void;
}

const TABS: RuleKind[] = ['transform', 'format', 'validate', 'length'];

export default function RulePicker({ open, column, onClose, onAdd }: RulePickerProps) {
  const [tab, setTab] = useState<RuleKind>('transform');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<RulePreset | null>(null);
  const [params, setParams] = useState<Record<string, any>>({});

  const visiblePresets = useMemo(() => {
    const list = PRESETS_BY_KIND[tab];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (p) => p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    );
  }, [tab, search]);

  const handleSelect = (preset: RulePreset) => {
    setSelected(preset);
    const initial: Record<string, any> = {};
    preset.params?.forEach((p) => { initial[p.key] = p.default; });
    setParams(initial);
  };

  const handleConfirm = () => {
    if (!selected) return;
    const rule = selected.build(params);
    onAdd(rule);
    handleClose();
  };

  const handleClose = () => {
    setSelected(null);
    setParams({});
    setSearch('');
    onClose();
  };

  const meta = KIND_META[tab];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        {selected && (
          <IconButton size="small" onClick={() => setSelected(null)}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            {selected ? selected.label : 'Add a rule'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            for column <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>{column}</Box>
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: 420, p: 0 }}>
        {!selected ? (
          <>
            {/* Category tabs */}
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}
            >
              {TABS.map((k) => {
                const m = KIND_META[k];
                return (
                  <Tab
                    key={k}
                    value={k}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{
                          width: 8, height: 8, borderRadius: '50%', bgcolor: m.color,
                        }} />
                        {m.label}
                      </Box>
                    }
                  />
                );
              })}
            </Tabs>

            <Box sx={{ p: 2 }}>
              <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                mb: 2, gap: 2,
              }}>
                <Typography variant="body2" color="text.secondary">{meta.tagline}</Typography>
                <TextField
                  size="small"
                  placeholder="Search rules…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={{ width: 240 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                  }}
                />
              </Box>

              {/* Preset cards */}
              <Box sx={{
                display: 'grid', gap: 1,
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              }}>
                {visiblePresets.map((p) => (
                  <Box
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      cursor: 'pointer',
                      transition: 'all .15s',
                      '&:hover': {
                        borderColor: meta.color,
                        bgcolor: meta.bg,
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                      {p.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {p.description}
                    </Typography>
                    {p.params && p.params.length > 0 && (
                      <Chip
                        label="needs input"
                        size="small"
                        variant="outlined"
                        sx={{ mt: 1, fontSize: '0.65rem', height: 20 }}
                      />
                    )}
                  </Box>
                ))}
                {visiblePresets.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                    No rules match your search.
                  </Typography>
                )}
              </Box>
            </Box>
          </>
        ) : (
          // Parameter form for the selected preset
          <Box sx={{ p: 3 }}>
            <Box sx={{
              p: 2, mb: 3, bgcolor: KIND_META[selected.kind].bg,
              border: '1px solid', borderColor: KIND_META[selected.kind].color + '33',
              borderRadius: 1.5,
            }}>
              <Typography variant="body2" color="text.secondary">
                {selected.description}
              </Typography>
            </Box>

            {selected.params && selected.params.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {selected.params.map((p) => (
                  <TextField
                    key={p.key}
                    label={p.label}
                    type={p.type === 'number' ? 'number' : 'text'}
                    value={params[p.key] ?? ''}
                    onChange={(e) => setParams({
                      ...params,
                      [p.key]: p.type === 'number' ? Number(e.target.value) : e.target.value,
                    })}
                    placeholder={p.placeholder}
                    helperText={p.helperText}
                    fullWidth
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No additional input required. Click <strong>Add Rule</strong> to apply this rule to the column.
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        {selected && (
          <Button variant="contained" onClick={handleConfirm}>
            Add Rule
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
