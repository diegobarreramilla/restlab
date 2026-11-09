import { buildImportReportText, buildImportReportFileName, formatImportedCount } from './import-report';

const report = {
  totalItems: 7,
  importedItems: 5,
  importedBreakdown: { requests: 4, folders: 1, environments: 0 }
};

describe('import report', () => {
  it('states how many items were imported out of the source total', () => {
    expect(formatImportedCount(report)).toBe('5 of 7 items imported');
  });

  it('lists skipped items and warnings separately', () => {
    const text = buildImportReportText({
      collectionName: 'Demo',
      format: 'postman',
      report,
      date: new Date('2026-11-08T10:00:00Z'),
      issues: [
        { severity: 'error', path: 'Folder / Bad One', message: 'Missing method' },
        { severity: 'warning', path: 'Two', message: 'Invalid maxRedirects' }
      ]
    });

    expect(text).toContain('Import report: Demo');
    expect(text).toContain('Source: Postman');
    expect(text).toContain('Date: 2026-11-08T10:00:00.000Z');
    expect(text).toContain('5 of 7 items imported');
    expect(text).toContain('Imported: 4 request(s), 1 folder(s), 0 environment(s)');
    expect(text).toContain('Skipped (1):\n- Folder / Bad One: Missing method');
    expect(text).toContain('Warnings (1):\n- Two: Invalid maxRedirects');
  });

  it('says so when nothing was skipped', () => {
    const text = buildImportReportText({ collectionName: 'Demo', format: 'insomnia', report, issues: [] });
    expect(text).toContain('Nothing was skipped.');
  });

  it('never writes the raw source items, which can hold secrets', () => {
    const text = buildImportReportText({
      collectionName: 'Demo',
      format: 'postman',
      report,
      issues: [{ severity: 'error', path: 'Bad', message: 'Missing method', sourceItem: { header: 'Bearer sk-live-xyz' } }]
    });
    expect(text).not.toContain('sk-live-xyz');
  });

  it('builds a safe file name', () => {
    expect(buildImportReportFileName('My API / v2?')).toBe('My-API-v2-import-report.txt');
    expect(buildImportReportFileName('')).toBe('collection-import-report.txt');
  });
});
