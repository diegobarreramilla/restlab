const { app, ipcMain } = require('electron');
const { createUnsavedDraftsStore } = require('../services/unsaved-drafts');

const registerUnsavedDraftsIpc = () => {
  const store = createUnsavedDraftsStore(app.getPath('userData'));

  ipcMain.handle('renderer:unsaved-drafts:get', () => store.read());
  ipcMain.handle('renderer:unsaved-drafts:save', (event, drafts) => store.write(drafts));
};

module.exports = registerUnsavedDraftsIpc;
