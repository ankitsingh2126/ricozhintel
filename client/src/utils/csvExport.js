// CSV generation and file download utility.
// Follows RFC 4180 rules for escaping commas, double quotes, and line breaks.

/**
 * Escapes a cell value for CSV output.
 * If value contains commas, quotes, or newlines, wraps in quotes and doubles inner quotes.
 */
export const escapeCsvCell = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Builds a valid CSV string from an array of header objects and rows.
 * @param {Array<{ label: string, key: string | ((row: any) => any) }>} columns
 * @param {Array<Object>} rows
 */
export const generateCsv = (columns, rows) => {
  if (!Array.isArray(columns) || columns.length === 0) return '';
  const headerLine = columns.map((col) => escapeCsvCell(col.label)).join(',');
  const rowLines = (rows || []).map((row) =>
    columns
      .map((col) => {
        const val = typeof col.key === 'function' ? col.key(row) : row[col.key];
        return escapeCsvCell(val);
      })
      .join(',')
  );
  return [headerLine, ...rowLines].join('\r\n');
};

/**
 * Initiates a browser download of a CSV file.
 * @param {string} csvContent
 * @param {string} filename
 */
export const downloadCsv = (csvContent, filename) => {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generates standard timestamped filename.
 * e.g. ricozhintel-kpis-2026-10-15.csv
 */
export const getExportFilename = (prefix = 'kpis') => {
  const dateStr = new Date().toISOString().split('T')[0];
  return `ricozhintel-${prefix}-${dateStr}.csv`;
};
