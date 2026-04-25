export const PLANTS = [
  { id: 'EAP', name: 'EAP' },
  { id: 'GAP', name: 'GAP' },
  { id: 'SLP', name: 'SLP' },
];

export const TURNOVER_TYPES = [
  { value: 'voluntary',   label: 'Voluntary' },
  { value: 'involuntary', label: 'Involuntary' },
];

export const LABOR_TYPES = [
  { value: 'direct',   label: 'Direct' },
  { value: 'indirect', label: 'Indirect' },
];

export const SHIFTS = [
  { value: '1st', label: '1st Shift' },
  { value: '2nd', label: '2nd Shift' },
];

export const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
];

export const TURNOVER_REASONS = [
  { value: 'resignation',      label: 'Resignation' },
  { value: 'retirement',       label: 'Retirement' },
  { value: 'termination',      label: 'Termination' },
  { value: 'job_abandonment',  label: 'Job Abandonment' },
  { value: 'end_of_contract',  label: 'End of Contract' },
  { value: 'layoff',           label: 'Layoff' },
  { value: 'performance',      label: 'Performance' },
  { value: 'other',            label: 'Other' },
];

export const TENURE_OPTIONS = [
  { value: 'under_3mo',  label: '< 3 Months' },
  { value: '3_6mo',      label: '3–6 Months' },
  { value: '6_12mo',     label: '6–12 Months' },
  { value: '1_2yr',      label: '1–2 Years' },
  { value: '2_5yr',      label: '2–5 Years' },
  { value: 'over_5yr',   label: '5+ Years' },
];

export const REHIRE_OPTIONS = [
  { value: 'yes',     label: 'Yes' },
  { value: 'no',      label: 'No' },
  { value: 'unknown', label: 'Unknown' },
];

export const REASON_LABELS = Object.fromEntries(
  TURNOVER_REASONS.map(r => [r.value, r.label])
);

export const TENURE_LABELS = Object.fromEntries(
  TENURE_OPTIONS.map(t => [t.value, t.label])
);
