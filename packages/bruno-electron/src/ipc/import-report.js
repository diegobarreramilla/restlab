const fs = require('node:fs');
const { ipcMain, dialog } = require('electron');

const MAX_REPORT_LENGTH = 5 * 1024 * 1024;

/**
 * Asks where to save an import report and writes it there. Local disk only: the text was built
 * in the renderer from the user's own import, and nothing leaves the machine.
 */
const saveImportReport = async (mainWindow, { defaultFileName, content } = {}) => {
  if (typeof content !== 'string' || !content) {
    throw new Error('The report is empty');
  }
  if (content.length > MAX_REPORT_LENGTH) {
    throw new Error('The report is too large to save');
  }
  const fileName = typeof defaultFileName === 'string' && defaultFileName ? defaultFileName : 'import-report.txt';

  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save import report',
    defaultPath: fileName,
    filters: [{ name: 'Text files', extensions: ['txt'] }]
  });

  if (canceled || !filePath) {
    return { saved: false, canceled: true };
  }

  await fs.promises.writeFile(filePath, content, 'utf8');
  return { saved: true, filePath };
};

const registerImportReportIpc = (mainWindow) => {
  ipcMain.handle('renderer:save-import-report', (event, report) => saveImportReport(mainWindow, report));
};

module.exports = registerImportReportIpc;
module.exports.saveImportReport = saveImportReport;
