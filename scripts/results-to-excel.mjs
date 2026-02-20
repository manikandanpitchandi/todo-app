import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';

const json = JSON.parse(readFileSync('test-results.json', 'utf-8'));

const rows = [['#', 'Suite', 'Test', 'Status', 'Duration (s)', 'Error']];
let index = 1;

for (const suite of json.suites) {
  for (const file of suite.suites ?? [suite]) {
    const suiteName = file.title ?? suite.title;
    for (const group of file.suites ?? [file]) {
      const groupName = group.title ?? suiteName;
      const specs = group.specs ?? [];
      for (const spec of specs) {
        for (const result of spec.tests ?? [spec]) {
          const test = result.results?.[0] ?? {};
          const status = test.status === 'passed' ? 'PASS'
                       : test.status === 'failed' ? 'FAIL'
                       : test.status ?? 'SKIP';
          const duration = test.duration != null
            ? (test.duration / 1000).toFixed(2)
            : '';
          const error = test.error?.message?.split('\n')[0] ?? '';
          rows.push([index++, groupName, result.title ?? spec.title, status, duration, error]);
        }
      }
    }
  }
}

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(rows);

// Column widths
ws['!cols'] = [
  { wch: 4 },   // #
  { wch: 22 },  // Suite
  { wch: 56 },  // Test
  { wch: 8 },   // Status
  { wch: 14 },  // Duration
  { wch: 50 },  // Error
];

// Header style (bold + green fill)
const headerFill = { fgColor: { rgb: '10B981' } };
const headerFont = { bold: true, color: { rgb: 'FFFFFF' } };
const headerAlign = { horizontal: 'center' };

for (let c = 0; c < 6; c++) {
  const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
  if (!ws[cellAddr]) continue;
  ws[cellAddr].s = { fill: headerFill, font: headerFont, alignment: headerAlign };
}

// Status cell coloring (row 1+)
const passColor = { fgColor: { rgb: 'D1FAE5' } }; // light green
const failColor = { fgColor: { rgb: 'FEE2E2' } }; // light red

for (let r = 1; r < rows.length; r++) {
  const statusCell = XLSX.utils.encode_cell({ r, c: 3 });
  if (!ws[statusCell]) continue;
  const status = rows[r][3];
  const fill = status === 'PASS' ? passColor : status === 'FAIL' ? failColor : undefined;
  ws[statusCell].s = {
    fill,
    font: { bold: true, color: { rgb: status === 'PASS' ? '059669' : 'DC2626' } },
    alignment: { horizontal: 'center' },
  };
}

XLSX.utils.book_append_sheet(wb, ws, 'Test Results');

// Summary sheet
const total    = rows.length - 1;
const passed   = rows.slice(1).filter(r => r[3] === 'PASS').length;
const failed   = rows.slice(1).filter(r => r[3] === 'FAIL').length;
const duration = rows.slice(1).reduce((s, r) => s + (parseFloat(r[4]) || 0), 0).toFixed(2);

const summaryRows = [
  ['Metric', 'Value'],
  ['Total Tests', total],
  ['Passed', passed],
  ['Failed', failed],
  ['Pass Rate', `${((passed / total) * 100).toFixed(1)}%`],
  ['Total Duration (s)', duration],
  ['Run Date', new Date().toLocaleString()],
];

const ws2 = XLSX.utils.aoa_to_sheet(summaryRows);
ws2['!cols'] = [{ wch: 20 }, { wch: 20 }];
for (let r = 0; r < summaryRows.length; r++) {
  const cell = XLSX.utils.encode_cell({ r, c: 0 });
  if (ws2[cell]) ws2[cell].s = { font: { bold: true } };
}

XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

const outPath = 'test-results.xlsx';
XLSX.writeFile(wb, outPath);
console.log(`Saved: ${outPath}`);
console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
