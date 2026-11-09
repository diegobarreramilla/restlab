const SOURCE_LABELS = {
  postman: 'Postman',
  insomnia: 'Insomnia'
};

const formatBreakdown = ({ requests = 0, folders = 0, environments = 0 } = {}) => {
  return `${requests} request(s), ${folders} folder(s), ${environments} environment(s)`;
};

export const getImportReportSourceLabel = (format) => SOURCE_LABELS[format] || format;

/**
 * One line for the import summary, e.g. "42 of 45 items imported".
 */
export const formatImportedCount = ({ importedItems, totalItems }) => {
  return `${importedItems} of ${totalItems} items imported`;
};

/**
 * Plain-text report of what an import kept and what it left out, ready to save to a file.
 * Source items are deliberately left out: they can hold tokens or internal URLs.
 */
export const buildImportReportText = ({ collectionName, format, report, issues = [], date = new Date() }) => {
  const lines = [
    `Import report: ${collectionName}`,
    `Source: ${getImportReportSourceLabel(format)}`,
    `Date: ${date.toISOString()}`,
    '',
    formatImportedCount(report),
    `Imported: ${formatBreakdown(report.importedBreakdown)}`
  ];

  const skipped = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity !== 'error');

  if (skipped.length > 0) {
    lines.push('', `Skipped (${skipped.length}):`);
    skipped.forEach((issue) => lines.push(`- ${issue.path}: ${issue.message}`));
  }
  if (warnings.length > 0) {
    lines.push('', `Warnings (${warnings.length}):`);
    warnings.forEach((issue) => lines.push(`- ${issue.path}: ${issue.message}`));
  }
  if (issues.length === 0) {
    lines.push('', 'Nothing was skipped.');
  }

  return `${lines.join('\n')}\n`;
};

export const buildImportReportFileName = (collectionName) => {
  const safeName = String(collectionName || 'collection').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${safeName || 'collection'}-import-report.txt`;
};
