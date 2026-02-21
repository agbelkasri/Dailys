export const PLANTS = [
  { id: 'EAP', name: 'EAP' },
  { id: 'GAP', name: 'GAP' },
  { id: 'SLP', name: 'SLP' },
];

export const ABSENCE_TYPES = [
  { value: 'planned',   label: 'Planned' },
  { value: 'unplanned', label: 'Unplanned' },
];

export const LABOR_TYPES = [
  { value: 'direct',   label: 'Direct' },
  { value: 'indirect', label: 'Indirect' },
];

export const SHIFTS = [
  { value: '1st', label: '1st Shift' },
  { value: '2nd', label: '2nd Shift' },
];

export const DURATIONS = [
  { value: 'full',    label: 'Full Day (8 hrs)',            hours: 8 },
  { value: 'half_am', label: 'Half Day - Morning (4 hrs)', hours: 4 },
  { value: 'half_pm', label: 'Half Day - Afternoon (4 hrs)', hours: 4 },
  { value: 'custom',  label: 'Custom Hours',                hours: null },
];

export const ABSENCE_REASONS = [
  { value: 'vacation',         label: 'Vacation' },
  { value: 'sick',             label: 'Sick' },
  { value: 'personal',         label: 'Personal' },
  { value: 'family_emergency', label: 'Family Emergency' },
  { value: 'jury_duty',        label: 'Jury Duty' },
  { value: 'bereavement',      label: 'Bereavement' },
  { value: 'fmla',             label: 'FMLA' },
  { value: 'work_injury',      label: 'Work Injury' },
  { value: 'no_call_no_show',  label: 'No Call / No Show' },
  { value: 'other',            label: 'Other' },
];

export const REASON_LABELS = Object.fromEntries(
  ABSENCE_REASONS.map(r => [r.value, r.label])
);

export const DURATION_LABELS = {
  full:    'Full Day',
  half_am: 'Half (AM)',
  half_pm: 'Half (PM)',
  custom:  'Custom',
};

export function getHoursForDuration(duration, customHours) {
  if (duration === 'custom') return parseFloat(customHours) || 0;
  const d = DURATIONS.find(dur => dur.value === duration);
  return d?.hours ?? 8;
}
