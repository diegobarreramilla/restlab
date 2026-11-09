const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const fsExtra = require('fs-extra');

jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn() },
  dialog: { showSaveDialog: jest.fn() }
}));

const { ipcMain, dialog } = require('electron');
const registerImportReportIpc = require('./import-report');
const { saveImportReport } = registerImportReportIpc;

describe('saveImportReport', () => {
  let dir;
  const mainWindow = {};

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-report-'));
    dialog.showSaveDialog.mockReset();
  });

  afterEach(() => {
    fsExtra.removeSync(dir);
  });

  it('writes the report where the user chose', async () => {
    const filePath = path.join(dir, 'report.txt');
    dialog.showSaveDialog.mockResolvedValue({ canceled: false, filePath });

    const result = await saveImportReport(mainWindow, { defaultFileName: 'demo.txt', content: 'hello' });

    expect(result).toEqual({ saved: true, filePath });
    expect(fs.readFileSync(filePath, 'utf8')).toBe('hello');
    expect(dialog.showSaveDialog.mock.calls[0][1].defaultPath).toBe('demo.txt');
  });

  it('writes nothing when the dialog is cancelled', async () => {
    dialog.showSaveDialog.mockResolvedValue({ canceled: true });

    await expect(saveImportReport(mainWindow, { content: 'hello' })).resolves.toEqual({ saved: false, canceled: true });
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it('rejects an empty or non-text report before opening any dialog', async () => {
    await expect(saveImportReport(mainWindow, { content: '' })).rejects.toThrow(/empty/);
    await expect(saveImportReport(mainWindow, { content: { not: 'text' } })).rejects.toThrow(/empty/);
    await expect(saveImportReport(mainWindow, undefined)).rejects.toThrow(/empty/);
    expect(dialog.showSaveDialog).not.toHaveBeenCalled();
  });

  it('registers the channel', () => {
    registerImportReportIpc(mainWindow);
    expect(ipcMain.handle).toHaveBeenCalledWith('renderer:save-import-report', expect.any(Function));
  });
});
