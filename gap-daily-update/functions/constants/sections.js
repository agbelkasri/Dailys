// Duplicate of src/constants/sections.js
// Keep in sync manually — do NOT import from src/ inside functions/

const SECTION_TYPES = {
  NORMAL: 'normal',
  CUSTOMER_INVENTORY: 'customer-inventory',
  DOWNTIME: 'downtime',
  QUALITY: 'quality',
};

const SECTIONS = [
  { id: 'ehs', measurable: 'EHS', responsible: 'Nicole', sectionType: SECTION_TYPES.NORMAL, sortOrder: 0 },
  { id: 'staffing-issues', measurable: 'Staffing Issues', responsible: 'Nicole', sectionType: SECTION_TYPES.NORMAL, sortOrder: 1 },
  { id: 'current-year-program-eop', measurable: 'Current Year Program EOP', responsible: 'Nicole', sectionType: SECTION_TYPES.NORMAL, sortOrder: 2 },
  { id: 'prem-freight', measurable: 'Prem. Freight / Customer Notes', responsible: 'Michelle', sectionType: SECTION_TYPES.NORMAL, sortOrder: 3 },
  { id: 'on-time-delivery', measurable: 'On Time Delivery', responsible: 'Michelle', sectionType: SECTION_TYPES.NORMAL, sortOrder: 4 },
  { id: 'customer-invty-status', measurable: 'Customer Invty Status', responsible: 'Michelle', sectionType: SECTION_TYPES.CUSTOMER_INVENTORY, sortOrder: 5 },
  { id: 'service', measurable: 'SERVICE', responsible: 'Michele', sectionType: SECTION_TYPES.NORMAL, sortOrder: 6 },
  { id: 'supplier-issues', measurable: 'Supplier Issues', responsible: 'Jeff Potter', sectionType: SECTION_TYPES.NORMAL, sortOrder: 7 },
  { id: 'labor-overtime', measurable: 'Labor / Overtime', responsible: 'John W', sectionType: SECTION_TYPES.NORMAL, sortOrder: 8 },
  { id: 'daily-efficiency-oee', measurable: 'Daily Efficiency / Daily OEE', responsible: 'John W', sectionType: SECTION_TYPES.NORMAL, sortOrder: 9 },
  { id: 'downtime-analysis', measurable: 'Downtime Analysis', responsible: 'John W', sectionType: SECTION_TYPES.DOWNTIME, sortOrder: 10 },
  { id: 'operations-update', measurable: 'Operations Update - Critical Issues', responsible: 'John W', sectionType: SECTION_TYPES.NORMAL, sortOrder: 11 },
  { id: 'mfg-mishit-reports', measurable: 'MFG Mishit Reports', responsible: 'John W', sectionType: SECTION_TYPES.NORMAL, sortOrder: 12 },
  { id: 'housekeeping', measurable: 'Housekeeping', responsible: 'John W', sectionType: SECTION_TYPES.NORMAL, sortOrder: 13 },
  { id: 'change-overs', measurable: 'Change Overs', responsible: 'John W', sectionType: SECTION_TYPES.NORMAL, sortOrder: 14 },
  { id: 'tooling', measurable: 'TOOLING', responsible: 'Scott', sectionType: SECTION_TYPES.NORMAL, sortOrder: 15 },
  { id: 'maintenance', measurable: 'Maintenance', responsible: 'Diego', sectionType: SECTION_TYPES.NORMAL, sortOrder: 16 },
  { id: 'quality-concerns', measurable: 'Quality Concerns', responsible: 'Yvonne', sectionType: SECTION_TYPES.QUALITY, sortOrder: 17 },
];

module.exports = { SECTIONS, SECTION_TYPES };
