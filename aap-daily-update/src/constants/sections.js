export const SECTION_TYPES = {
  NORMAL: 'normal',
  CUSTOMER_INVENTORY: 'customer-inventory',
  DOWNTIME: 'downtime',
  QUALITY: 'quality',
  EFFICIENCY: 'efficiency',
};

export const EFFICIENCY_THRESHOLDS = ['85%+ = Green', '69–84% = Yellow', '<69% = Red'];

// ── GAP ───────────────────────────────────────────────────────────────────────
export const SECTIONS = [
  { id: 'ehs',                    measurable: 'EHS',                                responsible: 'Nicole',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 0  },
  { id: 'staffing-issues',        measurable: 'Staffing Issues',                    responsible: 'Nicole',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 1  },
  { id: 'current-year-program-eop', measurable: 'Current Year Program EOP',         responsible: 'Operations',     sectionType: SECTION_TYPES.NORMAL,             sortOrder: 2  },
  { id: 'prem-freight',           measurable: 'Prem. Freight / Customer Notes',     responsible: 'Michelle',       sectionType: SECTION_TYPES.NORMAL,             sortOrder: 3  },
  { id: 'on-time-delivery',       measurable: 'On Time Delivery',                   responsible: 'Michelle',       sectionType: SECTION_TYPES.NORMAL,             sortOrder: 4  },
  { id: 'customer-invty-status',  measurable: 'Customer Inventory Status',          responsible: 'Michelle',       sectionType: SECTION_TYPES.CUSTOMER_INVENTORY, sortOrder: 5  },
  { id: 'service',                measurable: 'SERVICE',                            responsible: 'Michele',        sectionType: SECTION_TYPES.NORMAL,             sortOrder: 6  },
  { id: 'supplier-issues',        measurable: 'Supplier Issues',                    responsible: 'Jeff Potter',    sectionType: SECTION_TYPES.NORMAL,             sortOrder: 7  },
  { id: 'labor-overtime',         measurable: 'Labor / Overtime',                   responsible: 'John W',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 8  },
  { id: 'daily-efficiency-oee',   measurable: 'Daily Efficiency',                   responsible: 'John W',         sectionType: SECTION_TYPES.EFFICIENCY,         sortOrder: 9,  thresholds: EFFICIENCY_THRESHOLDS },
  { id: 'downtime-analysis',      measurable: 'Downtime Analysis',                  responsible: 'John W',         sectionType: SECTION_TYPES.DOWNTIME,           sortOrder: 10 },
  { id: 'operations-update',      measurable: 'Operations Update - Critical Issues', responsible: 'John W',        sectionType: SECTION_TYPES.NORMAL,             sortOrder: 11 },
  { id: 'mfg-mishit-reports',     measurable: 'MFG Mishit Reports',                 responsible: 'John W',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 12 },
  { id: 'housekeeping',           measurable: 'Housekeeping',                       responsible: 'John W',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 13 },
  { id: 'change-overs',           measurable: 'Change Overs',                       responsible: 'John W',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 14 },
  { id: 'tooling',                measurable: 'TOOLING',                            responsible: 'Scott',          sectionType: SECTION_TYPES.NORMAL,             sortOrder: 15 },
  { id: 'maintenance',            measurable: 'Maintenance',                        responsible: 'Diego',          sectionType: SECTION_TYPES.NORMAL,             sortOrder: 16   },
  { id: 'me-critical',            measurable: 'M&E Critical',                       responsible: 'Diego',          sectionType: SECTION_TYPES.NORMAL,             sortOrder: 16.5 },
  { id: 'quality-concerns',       measurable: 'Quality Concerns',                   responsible: 'Yvonne',         sectionType: SECTION_TYPES.QUALITY,            sortOrder: 17   },
];

// ── EAP ───────────────────────────────────────────────────────────────────────
export const EAP_SECTIONS = [
  { id: 'ehs',                    measurable: 'EHS',                                responsible: 'Nicole',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 0  },
  { id: 'staffing-issues',        measurable: 'Staffing Issues',                    responsible: 'Nicole',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 1  },
  { id: 'current-year-program-eop', measurable: 'Current Year Program EOP',         responsible: 'Operations',     sectionType: SECTION_TYPES.NORMAL,             sortOrder: 2  },
  { id: 'prem-freight',           measurable: 'Prem. Freight / Customer Notes',     responsible: 'Jeff M',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 3  },
  { id: 'on-time-delivery',       measurable: 'On Time Delivery',                   responsible: 'Jeff M',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 4  },
  { id: 'customer-invty-status',  measurable: 'Customer FG Inventory Status',       responsible: 'Jeff M',         sectionType: SECTION_TYPES.CUSTOMER_INVENTORY, sortOrder: 5  },
  { id: 'service',                measurable: 'Service',                            responsible: 'Jeff M',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 6  },
  { id: 'supplier-issues',        measurable: 'Supplier Issues',                    responsible: 'Jeff Potter',    sectionType: SECTION_TYPES.NORMAL,             sortOrder: 7  },
  { id: 'labor-overtime',         measurable: 'Labor / Overtime',                   responsible: 'Jeff M',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 8  },
  { id: 'daily-efficiency-oee',   measurable: 'Daily Efficiency',                   responsible: 'Jeff M',         sectionType: SECTION_TYPES.EFFICIENCY,         sortOrder: 9,  thresholds: EFFICIENCY_THRESHOLDS },
  { id: 'downtime-analysis',      measurable: 'Downtime Analysis',                  responsible: 'Jeff M',         sectionType: SECTION_TYPES.DOWNTIME,           sortOrder: 10 },
  { id: 'operations-update',      measurable: 'Operations Update - Critical Issues', responsible: 'Jeff M',        sectionType: SECTION_TYPES.NORMAL,             sortOrder: 11 },
  { id: 'mfg-mishit-reports',     measurable: 'MFG Mishit Reports',                 responsible: 'Jeff M',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 12 },
  { id: 'housekeeping',           measurable: 'Housekeeping',                       responsible: 'Jeff M',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 13 },
  { id: 'tooling',                measurable: 'TOOLING',                            responsible: 'Mike H',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 15 },
  { id: 'maintenance',            measurable: 'Maintenance',                        responsible: 'Julius',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 16   },
  { id: 'me-critical',            measurable: 'M&E Critical',                       responsible: 'Julius',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 16.5 },
  { id: 'quality-concerns',       measurable: 'Quality Concerns',                   responsible: 'Mark Y / Isaac', sectionType: SECTION_TYPES.QUALITY,            sortOrder: 17   },
];

// ── SLP ───────────────────────────────────────────────────────────────────────
export const SLP_SECTIONS = [
  { id: 'ehs',                    measurable: 'EHS',                                responsible: 'Laura',          sectionType: SECTION_TYPES.NORMAL,             sortOrder: 0    },
  { id: 'staffing-issues',        measurable: 'Staffing Issues',                    responsible: 'Laura',          sectionType: SECTION_TYPES.NORMAL,             sortOrder: 1    },
  { id: 'current-year-program-eop', measurable: 'Current Year Customer EOP',        responsible: 'Claudia',        sectionType: SECTION_TYPES.NORMAL,             sortOrder: 2    },
  { id: 'prem-freight',           measurable: 'Prem. Freight / Customer Notes',     responsible: 'Claudia',        sectionType: SECTION_TYPES.NORMAL,             sortOrder: 3    },
  { id: 'on-time-delivery',       measurable: 'On Time Delivery',                   responsible: 'Claudia',        sectionType: SECTION_TYPES.NORMAL,             sortOrder: 4    },
  { id: 'customer-invty-status',  measurable: 'Customer Inventory Status',          responsible: 'Claudia',        sectionType: SECTION_TYPES.CUSTOMER_INVENTORY, sortOrder: 5    },
  { id: 'supplier-issues',        measurable: 'Supplier Issues',                    responsible: 'Claudia',        sectionType: SECTION_TYPES.NORMAL,             sortOrder: 7    },
  { id: 'labor-overtime',         measurable: 'Labor / Overtime',                   responsible: 'Claudia',        sectionType: SECTION_TYPES.NORMAL,             sortOrder: 8    },
  { id: 'daily-efficiency-oee',   measurable: 'Daily Efficiency',                   responsible: 'Claudia',        sectionType: SECTION_TYPES.EFFICIENCY,         sortOrder: 9,   thresholds: EFFICIENCY_THRESHOLDS },
  { id: 'downtime-analysis',      measurable: 'Downtime Analysis',                  responsible: 'Claudia',        sectionType: SECTION_TYPES.DOWNTIME,           sortOrder: 10   },
  { id: 'new-projects',           measurable: 'New Projects',                       responsible: 'Arturo',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 10.5 },
  { id: 'operations-update',      measurable: 'Operations Update - Critical Issues', responsible: 'Claudia',       sectionType: SECTION_TYPES.NORMAL,             sortOrder: 11   },
  { id: 'mfg-mishit-reports',     measurable: 'MFG Mishit Reports',                 responsible: 'Arturo',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 12   },
  { id: 'housekeeping',           measurable: '5S / Housekeeping',                  responsible: 'Laura',          sectionType: SECTION_TYPES.NORMAL,             sortOrder: 13   },
  { id: 'change-overs',           measurable: 'Die Sets',                           responsible: 'Arturo',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 14   },
  { id: 'tooling',                measurable: 'TOOLING',                            responsible: 'Arturo',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 15   },
  { id: 'maintenance',            measurable: 'Maintenance',                        responsible: 'Arturo',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 16   },
  { id: 'me-critical',            measurable: 'M&E Critical',                       responsible: 'Arturo',         sectionType: SECTION_TYPES.NORMAL,             sortOrder: 16.5 },
  { id: 'quality-concerns',       measurable: 'Quality Concerns',                   responsible: 'Jezael',         sectionType: SECTION_TYPES.QUALITY,            sortOrder: 17   },
];

// ── Helper ────────────────────────────────────────────────────────────────────
export function getSectionsForPlant(plantId) {
  if (plantId === 'SLP') return SLP_SECTIONS;
  if (plantId === 'EAP') return EAP_SECTIONS;
  return SECTIONS; // GAP default
}
