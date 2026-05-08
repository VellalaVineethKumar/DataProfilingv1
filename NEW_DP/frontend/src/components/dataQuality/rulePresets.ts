// frontend/src/components/dataQuality/rulePresets.ts
//
// Plain-English rule presets that map to the backend Rule schema.
// The whole point: a business analyst should never have to type a regex.
// They pick "Must be a valid email" and we generate the underlying rule.

export interface Rule {
  mode: string;            // 'Clean' | 'Replace' | 'Extract' | 'Validate' | 'Case' | 'Length'
  pattern: string;
  replace: string;
  case: string;
  length_mode: string;
  min_length: number;
  max_length: number;
  exact_length: number;
  /**
   * Optional human-readable label. When present, summarizeRule() prefers this
   * over its preset/regex-based fallback. We populate it for AI-suggested rules
   * so the user sees the AI's own explanation instead of a generic "Custom regex".
   * Frontend-only field — backend ignores it (extra fields are dropped by Pydantic).
   */
  note?: string;
}

export type RuleKind = 'transform' | 'validate' | 'format' | 'length';

export interface RulePreset {
  id: string;
  label: string;            // plain-English name shown to the user
  description: string;      // short hint about what it does
  kind: RuleKind;           // category (drives badge color)
  build: (params?: Record<string, any>) => Rule;
  /** Friendly summary of an existing rule built from this preset, e.g. "Must be a valid email" */
  summarize?: (rule: Rule) => string;
  /** Optional parameter form when the preset needs user input (e.g. length number) */
  params?: PresetParam[];
}

export interface PresetParam {
  key: string;
  label: string;
  type: 'number' | 'text' | 'select';
  default: any;
  options?: { label: string; value: string }[];
  placeholder?: string;
  helperText?: string;
}

const emptyRule = (): Rule => ({
  mode: 'Clean',
  pattern: '',
  replace: '',
  case: 'UPPERCASE',
  length_mode: 'Exact',
  min_length: 0,
  max_length: 50,
  exact_length: 10,
});

// ---------------------------------------------------------------------------
// Preset definitions
// ---------------------------------------------------------------------------

export const RULE_PRESETS: RulePreset[] = [
  // --- TRANSFORM (Clean Up) -------------------------------------------------
  {
    id: 'remove-numbers',
    label: 'Remove numbers',
    description: 'Strip all digits from each value (e.g. "ABC123" → "ABC").',
    kind: 'transform',
    build: () => ({ ...emptyRule(), mode: 'Clean', pattern: '[0-9]+' }),
  },
  {
    id: 'remove-letters',
    label: 'Remove letters',
    description: 'Strip all alphabetic characters (e.g. "ABC123" → "123").',
    kind: 'transform',
    build: () => ({ ...emptyRule(), mode: 'Clean', pattern: '[a-zA-Z]+' }),
  },
  {
    id: 'remove-special-chars',
    label: 'Remove special characters',
    description: 'Keep only letters, numbers and spaces. Drops symbols like @ # $ % & * etc.',
    kind: 'transform',
    build: () => ({ ...emptyRule(), mode: 'Clean', pattern: '[^a-zA-Z0-9 ]' }),
  },
  {
    id: 'remove-punctuation',
    label: 'Remove punctuation',
    description: 'Drop punctuation marks (.,;:!? etc.) while keeping letters, digits and spaces.',
    kind: 'transform',
    build: () => ({ ...emptyRule(), mode: 'Clean', pattern: '[\\.,;:!?\\-_/\\\\]' }),
  },
  {
    id: 'collapse-spaces',
    label: 'Collapse multiple spaces',
    description: 'Replace any run of whitespace with a single space.',
    kind: 'transform',
    build: () => ({ ...emptyRule(), mode: 'Replace', pattern: '\\s+', replace: ' ' }),
  },
  {
    id: 'trim-whitespace',
    label: 'Trim leading / trailing spaces',
    description: 'Remove whitespace at the start or end of each value.',
    kind: 'transform',
    build: () => ({ ...emptyRule(), mode: 'Replace', pattern: '^\\s+|\\s+$', replace: '' }),
  },
  {
    id: 'replace-text',
    label: 'Find and replace text',
    description: 'Substitute one piece of text for another wherever it appears.',
    kind: 'transform',
    params: [
      { key: 'find', label: 'Find', type: 'text', default: '', placeholder: 'old value' },
      { key: 'replaceWith', label: 'Replace with', type: 'text', default: '', placeholder: 'new value' },
    ],
    build: (p) => ({
      ...emptyRule(),
      mode: 'Replace',
      // Escape regex special chars in the search pattern so user input is literal.
      pattern: String(p?.find ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      // Escape backslashes in the replacement so Python's re.sub does NOT treat
      // `\1` / `\g<1>` etc. as backreferences. Replacement is intended to be literal text.
      replace: String(p?.replaceWith ?? '').replace(/\\/g, '\\\\'),
    }),
  },

  // --- FORMAT ---------------------------------------------------------------
  {
    id: 'case-upper',
    label: 'Convert to UPPERCASE',
    description: 'Make every value all caps (e.g. "hello" → "HELLO").',
    kind: 'format',
    build: () => ({ ...emptyRule(), mode: 'Case', case: 'UPPERCASE' }),
  },
  {
    id: 'case-lower',
    label: 'Convert to lowercase',
    description: 'Make every value all lowercase (e.g. "HELLO" → "hello").',
    kind: 'format',
    build: () => ({ ...emptyRule(), mode: 'Case', case: 'lowercase' }),
  },
  {
    id: 'case-title',
    label: 'Convert to Title Case',
    description: 'Capitalize the first letter of each word (e.g. "tea coffee" → "Tea Coffee").',
    kind: 'format',
    build: () => ({ ...emptyRule(), mode: 'Case', case: 'Title Case' }),
  },

  // --- VALIDATE -------------------------------------------------------------
  {
    id: 'validate-not-empty',
    label: 'Must not be empty',
    description: 'Flag any row where this column is blank or whitespace-only.',
    kind: 'validate',
    // Anchored, but tolerates leading/trailing whitespace as long as some
    // non-whitespace exists somewhere. "  abc  " passes; ""  and "   " fail.
    build: () => ({ ...emptyRule(), mode: 'Validate', pattern: '^\\s*\\S+.*$' }),
  },
  {
    id: 'validate-numeric',
    label: 'Must be numeric only',
    description: 'Flag any value containing non-digit characters.',
    kind: 'validate',
    build: () => ({ ...emptyRule(), mode: 'Validate', pattern: '^-?\\d+(?:\\.\\d+)?$' }),
  },
  {
    id: 'validate-alphabetic',
    label: 'Must be letters only',
    description: 'Flag any value containing digits or symbols.',
    kind: 'validate',
    build: () => ({ ...emptyRule(), mode: 'Validate', pattern: '^[A-Za-z\\s]+$' }),
  },
  {
    id: 'validate-alphanumeric',
    label: 'Must be alphanumeric',
    description: 'Flag any value with symbols (letters and digits only, no special chars).',
    kind: 'validate',
    build: () => ({ ...emptyRule(), mode: 'Validate', pattern: '^[A-Za-z0-9]+$' }),
  },
  {
    id: 'validate-email',
    label: 'Must be a valid email',
    description: 'Flag rows whose value does not look like an email address.',
    kind: 'validate',
    build: () => ({ ...emptyRule(), mode: 'Validate', pattern: '^[\\w.+-]+@[\\w-]+\\.[\\w.-]+$' }),
  },
  {
    id: 'validate-phone',
    label: 'Must be a valid phone number',
    description: 'Flag rows whose value does not match a 10-digit phone format.',
    kind: 'validate',
    build: () => ({ ...emptyRule(), mode: 'Validate', pattern: '^\\+?\\d{1,3}?[\\s.-]?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}$' }),
  },
  {
    id: 'validate-date-iso',
    label: 'Must be a valid date (YYYY-MM-DD)',
    description: 'Flag rows whose value is not in ISO date format.',
    kind: 'validate',
    build: () => ({ ...emptyRule(), mode: 'Validate', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }),
  },
  {
    id: 'validate-date-us',
    label: 'Must be a valid date (MM/DD/YYYY)',
    description: 'Flag rows whose value is not in US date format.',
    kind: 'validate',
    build: () => ({ ...emptyRule(), mode: 'Validate', pattern: '^\\d{2}/\\d{2}/\\d{4}$' }),
  },
  {
    id: 'validate-currency',
    label: 'Must be a currency amount',
    description: 'Flag values that are not numeric currency (optional $, decimals OK).',
    kind: 'validate',
    build: () => ({ ...emptyRule(), mode: 'Validate', pattern: '^\\$?\\d+(?:[.,]\\d{1,2})?$' }),
  },
  {
    id: 'validate-url',
    label: 'Must be a valid URL',
    description: 'Flag values that do not start with http:// or https://.',
    kind: 'validate',
    build: () => ({ ...emptyRule(), mode: 'Validate', pattern: '^https?://[\\w./?=&%-]+$' }),
  },
  {
    id: 'validate-zip-us',
    label: 'Must be a valid ZIP code (US)',
    description: 'Flag values that are not a 5- or 9-digit US ZIP.',
    kind: 'validate',
    build: () => ({ ...emptyRule(), mode: 'Validate', pattern: '^\\d{5}(?:-\\d{4})?$' }),
  },
  {
    id: 'validate-postcode-uk',
    label: 'Must be a valid postcode (UK)',
    description: 'Flag values that are not a UK postcode.',
    kind: 'validate',
    build: () => ({ ...emptyRule(), mode: 'Validate', pattern: '^[A-Z]{1,2}\\d[A-Z\\d]?\\s?\\d[A-Z]{2}$' }),
  },
  {
    id: 'validate-pincode-in',
    label: 'Must be a valid pincode (India)',
    description: 'Flag values that are not a 6-digit Indian PIN code.',
    kind: 'validate',
    build: () => ({ ...emptyRule(), mode: 'Validate', pattern: '^[1-9]\\d{5}$' }),
  },

  // --- LENGTH ---------------------------------------------------------------
  {
    id: 'length-exact',
    label: 'Exact length',
    description: 'Flag rows whose value is not exactly N characters long.',
    kind: 'length',
    params: [
      { key: 'len', label: 'Required length', type: 'number', default: 10 },
    ],
    build: (p) => ({
      ...emptyRule(),
      mode: 'Length',
      length_mode: 'Exact',
      exact_length: Number(p?.len ?? 10),
    }),
    summarize: (r) => `Length must be exactly ${r.exact_length}`,
  },
  {
    id: 'length-min',
    label: 'Minimum length',
    description: 'Flag rows shorter than N characters.',
    kind: 'length',
    params: [
      { key: 'min', label: 'Minimum length', type: 'number', default: 1 },
    ],
    build: (p) => ({
      ...emptyRule(),
      mode: 'Length',
      length_mode: 'Minimum',
      min_length: Number(p?.min ?? 1),
    }),
    summarize: (r) => `Length must be at least ${r.min_length}`,
  },
  {
    id: 'length-max',
    label: 'Maximum length',
    description: 'Flag rows longer than N characters.',
    kind: 'length',
    params: [
      { key: 'max', label: 'Maximum length', type: 'number', default: 50 },
    ],
    build: (p) => ({
      ...emptyRule(),
      mode: 'Length',
      length_mode: 'Maximum',
      max_length: Number(p?.max ?? 50),
    }),
    summarize: (r) => `Length must be at most ${r.max_length}`,
  },
  {
    id: 'length-range',
    label: 'Length between',
    description: 'Flag rows with length outside the [min, max] range.',
    kind: 'length',
    params: [
      { key: 'min', label: 'Min', type: 'number', default: 1 },
      { key: 'max', label: 'Max', type: 'number', default: 50 },
    ],
    build: (p) => ({
      ...emptyRule(),
      mode: 'Length',
      length_mode: 'Range',
      min_length: Number(p?.min ?? 1),
      max_length: Number(p?.max ?? 50),
    }),
    summarize: (r) => `Length must be between ${r.min_length} and ${r.max_length}`,
  },

  // --- ADVANCED (custom regex escape hatch) ---------------------------------
  {
    id: 'custom-regex-clean',
    label: 'Custom regex — Remove matches',
    description: 'Advanced. Strip every match of your regex pattern from each value.',
    kind: 'transform',
    params: [
      { key: 'pattern', label: 'Regex pattern', type: 'text', default: '', placeholder: '[0-9]+' },
    ],
    build: (p) => ({ ...emptyRule(), mode: 'Clean', pattern: String(p?.pattern ?? '') }),
    summarize: (r) => `Custom: remove matches of /${r.pattern}/`,
  },
  {
    id: 'custom-regex-validate',
    label: 'Custom regex — Validate',
    description: 'Advanced. Flag rows whose value does not match your regex.',
    kind: 'validate',
    params: [
      { key: 'pattern', label: 'Regex pattern', type: 'text', default: '', placeholder: '^[A-Z]{3}-\\d{4}$' },
    ],
    build: (p) => ({ ...emptyRule(), mode: 'Validate', pattern: String(p?.pattern ?? '') }),
    summarize: (r) => `Custom: must match /${r.pattern}/`,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const PRESETS_BY_KIND: Record<RuleKind, RulePreset[]> = {
  transform: RULE_PRESETS.filter((p) => p.kind === 'transform'),
  format: RULE_PRESETS.filter((p) => p.kind === 'format'),
  validate: RULE_PRESETS.filter((p) => p.kind === 'validate'),
  length: RULE_PRESETS.filter((p) => p.kind === 'length'),
};

export const KIND_META: Record<RuleKind, { label: string; tagline: string; color: string; bg: string }> = {
  transform: {
    label: 'Clean Up',
    tagline: 'Modify the value (remove, replace, trim).',
    color: '#1e40af',
    bg: '#eff6ff',
  },
  format: {
    label: 'Format',
    tagline: 'Standardize the case style.',
    color: '#7c3aed',
    bg: '#f5f3ff',
  },
  validate: {
    label: 'Validate',
    tagline: 'Flag rows that fail (sent to Rejected).',
    color: '#b45309',
    bg: '#fffbeb',
  },
  length: {
    label: 'Length',
    tagline: 'Check that the value has the right length.',
    color: '#0e7490',
    bg: '#ecfeff',
  },
};

/** Map a stored Rule back to a friendly summary line. */
export function summarizeRule(rule: Rule): string {
  // 0) AI-generated or manually-noted rules carry their own friendly label.
  if (rule.note && rule.note.trim()) return rule.note.trim();

  // 1) Try to find the preset that built this rule.
  const matches = RULE_PRESETS.filter((p) => {
    const built = p.build({});
    if (built.mode !== rule.mode) return false;
    if (p.params && p.params.length) return false; // parameterized — handle below
    return (
      built.pattern === rule.pattern &&
      built.replace === rule.replace &&
      built.case === rule.case &&
      built.length_mode === rule.length_mode
    );
  });
  if (matches.length > 0) return matches[0].label;

  // 2) Parameterized cases — use the preset's own summarize().
  if (rule.mode === 'Length') {
    const lenPreset = RULE_PRESETS.find((p) => p.id === `length-${rule.length_mode.toLowerCase()}`);
    if (lenPreset?.summarize) return lenPreset.summarize(rule);
  }
  if (rule.mode === 'Replace' && rule.pattern && rule.pattern !== '\\s+' && rule.pattern !== '^\\s+|\\s+$') {
    return `Find "${rule.pattern.replace(/\\(.)/g, '$1')}" → "${rule.replace}"`;
  }
  if (rule.mode === 'Case') {
    return `Convert to ${rule.case}`;
  }
  if (rule.mode === 'Validate') {
    return `Custom: must match /${rule.pattern}/`;
  }
  if (rule.mode === 'Clean') {
    return `Custom: remove matches of /${rule.pattern}/`;
  }
  if (rule.mode === 'Extract') {
    return `Extract matches of /${rule.pattern}/`;
  }
  return `${rule.mode}: ${rule.pattern || '(no pattern)'}`;
}

/** Return the kind for a stored rule (for badge coloring). */
export function ruleKind(rule: Rule): RuleKind {
  if (rule.mode === 'Validate' || rule.mode === 'Length') {
    return rule.mode === 'Length' ? 'length' : 'validate';
  }
  if (rule.mode === 'Case') return 'format';
  return 'transform';
}
