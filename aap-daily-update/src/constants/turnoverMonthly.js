// Aggregate monthly turnover tracking — mirrors the "Turnover_Tracker" Excel.
//
// This is deliberately SEPARATE from the per-employee `turnovers` collection.
// Here we store monthly End-of-Month headcount + termination COUNTS per plant
// and category, then compute monthly % and YTD % turnover the same way the
// Excel workbook does. No individual employee records live here.

export const TURNOVER_PLANTS = [
  { id: 'EAP', name: 'EAP' },
  { id: 'GAP', name: 'GAP' },
  { id: 'SLP', name: 'SLP' },
];

// The three headcount / termination categories, in display order.
export const TURNOVER_CATEGORIES = [
  { id: 'salary',   label: 'Salary',            payrollType: 'Salary' },
  { id: 'direct',   label: 'Direct (Hourly)',   payrollType: 'Hourly' },
  { id: 'indirect', label: 'Indirect (Hourly)', payrollType: 'Hourly' },
];

export const CATEGORY_IDS = TURNOVER_CATEGORIES.map(c => c.id);

// Excel "Labor Type" column value (lower-cased) -> our category id.
// Anything not in this map (e.g. a "Total" row) is skipped by the parser.
export const LABOR_TYPE_TO_CATEGORY = {
  salary:   'salary',
  direct:   'direct',
  indirect: 'indirect',
};

export const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// A zeroed category map — the default shape of a monthly doc's category fields.
export function emptyCategoryMap() {
  return {
    salary:   { headcount: 0, terminations: 0 },
    direct:   { headcount: 0, terminations: 0 },
    indirect: { headcount: 0, terminations: 0 },
  };
}
