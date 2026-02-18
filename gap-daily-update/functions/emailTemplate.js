const STATUS_COLORS = { G: '#00B050', Y: '#FFFF00', R: '#FF0000', '': '#E0E0E0' };
const STATUS_TEXT = { G: 'G', Y: 'Y', R: 'R', '': '—' };

function formatSubTable(sectionType, subTableData) {
  if (!subTableData?.length) return '<em style="color:#aaa">No entries</em>';

  if (sectionType === 'customer-inventory') {
    const rows = subTableData.map(
      (r) =>
        `<tr>
          <td style="padding:3px 6px;border:1px solid #ddd">${r.customer || ''}</td>
          <td style="padding:3px 6px;border:1px solid #ddd">${r.programNumber || ''}</td>
          <td style="padding:3px 6px;border:1px solid #ddd">${r.partsSupplied || ''}</td>
          <td style="padding:3px 6px;border:1px solid #ddd">${r.coverageNotes || ''}</td>
        </tr>`
    ).join('');
    return `<table style="border-collapse:collapse;font-size:11px;width:100%">
      <tr style="background:#f5f5f5">
        <th style="padding:3px 6px;border:1px solid #ddd;text-align:left">Customer</th>
        <th style="padding:3px 6px;border:1px solid #ddd;text-align:left">Program #</th>
        <th style="padding:3px 6px;border:1px solid #ddd;text-align:left"># Parts</th>
        <th style="padding:3px 6px;border:1px solid #ddd;text-align:left">Coverage Notes</th>
      </tr>${rows}</table>`;
  }

  if (sectionType === 'downtime') {
    const rows = subTableData.map(
      (r) =>
        `<tr>
          <td style="padding:3px 6px;border:1px solid #ddd">${r.reason || ''}</td>
          <td style="padding:3px 6px;border:1px solid #ddd">${r.percentage || ''}</td>
        </tr>`
    ).join('');
    return `<table style="border-collapse:collapse;font-size:11px">
      <tr style="background:#f5f5f5">
        <th style="padding:3px 6px;border:1px solid #ddd;text-align:left">Reason</th>
        <th style="padding:3px 6px;border:1px solid #ddd;text-align:left">Percentage</th>
      </tr>${rows}</table>`;
  }

  if (sectionType === 'quality') {
    const rows = subTableData.map(
      (r) =>
        `<tr>
          <td style="padding:3px 6px;border:1px solid #ddd">${r.workcenterCode || ''}</td>
          <td style="padding:3px 6px;border:1px solid #ddd">${r.partNumber || ''}</td>
          <td style="padding:3px 6px;border:1px solid #ddd">${r.statusNotes || ''}</td>
        </tr>`
    ).join('');
    return `<table style="border-collapse:collapse;font-size:11px">
      <tr style="background:#f5f5f5">
        <th style="padding:3px 6px;border:1px solid #ddd;text-align:left">WC Code</th>
        <th style="padding:3px 6px;border:1px solid #ddd;text-align:left">Part No</th>
        <th style="padding:3px 6px;border:1px solid #ddd;text-align:left">Status Notes</th>
      </tr>${rows}</table>`;
  }

  return '';
}

function generateReportHTML(sections, date) {
  const rows = sections
    .map((s) => {
      const color = STATUS_COLORS[s.status] || STATUS_COLORS[''];
      const textColor = s.status === 'Y' ? '#333' : s.status ? '#fff' : '#999';
      const content =
        s.sectionType === 'normal'
          ? `<span style="white-space:pre-wrap;font-size:12px">${(s.comments || '').replace(/</g, '&lt;')}</span>`
          : formatSubTable(s.sectionType, s.subTableData);

      return `<tr style="border-left:4px solid ${color}">
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:11px;color:#555;font-weight:600;vertical-align:top;white-space:nowrap">${s.responsible}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:12px;font-weight:500;vertical-align:top;white-space:nowrap">${s.measurable}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;vertical-align:top">
          <span style="display:inline-block;padding:3px 8px;border-radius:4px;background:${color};color:${textColor};font-weight:700;font-size:12px">${STATUS_TEXT[s.status] || '—'}</span>
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;vertical-align:top">${content}</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GAP Daily Update - ${date}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1a3a5c; color: white; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    tr:hover { background: #fafbfc; }
  </style>
</head>
<body>
  <div style="background:#1a3a5c;color:white;padding:16px 20px;margin:-20px -20px 20px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <h1 style="margin:0;font-size:20px">GAP Daily Update</h1>
      <p style="margin:4px 0 0;font-size:12px;opacity:0.7">Submitted to Executive Team by 5 PM</p>
    </div>
    <div style="text-align:right">
      <div style="font-size:14px;font-weight:600">${date}</div>
      <div style="font-size:11px;opacity:0.7">Generated at ${new Date().toLocaleTimeString()}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:110px">Responsible Party</th>
        <th style="width:180px">Measurable</th>
        <th style="width:72px">Status G/Y/R</th>
        <th>Comments / Explanation</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

module.exports = { generateReportHTML };
