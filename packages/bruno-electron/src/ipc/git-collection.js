const { ipcMain } = require('electron');
const gitCollection = require('../utils/git-collection');

// Version control for one collection. Every channel takes the collection's folder; the paths it accepts are
// checked against that folder in `utils/git-collection`, so the renderer cannot reach outside it.
const registerGitCollectionIpc = (mainWindow) => {
  ipcMain.handle('renderer:git-overview', (event, { collectionPath }) => gitCollection.getOverview(collectionPath));
  ipcMain.handle('renderer:git-init', (event, { collectionPath }) => gitCollection.initRepository(collectionPath));
  ipcMain.handle('renderer:git-stage', (event, { collectionPath, files }) => gitCollection.stage(collectionPath, files));
  ipcMain.handle('renderer:git-unstage', (event, { collectionPath, files }) => gitCollection.unstage(collectionPath, files));
  ipcMain.handle('renderer:git-discard', (event, { collectionPath, files }) => gitCollection.discard(collectionPath, files));
  ipcMain.handle('renderer:git-commit', (event, { collectionPath, message }) => gitCollection.commit(collectionPath, message));
  ipcMain.handle('renderer:git-checkout-branch', (event, { collectionPath, branchName, create }) =>
    gitCollection.checkoutBranch(mainWindow, collectionPath, { branchName, create })
  );
  ipcMain.handle('renderer:git-history', (event, { collectionPath, filePath }) => gitCollection.getHistory(collectionPath, { filePath }));
  ipcMain.handle('renderer:git-commit-files', (event, { collectionPath, commitHash }) =>
    gitCollection.getCommitFiles(collectionPath, commitHash)
  );
  ipcMain.handle('renderer:git-diff', (event, { collectionPath, filePath, source, commitHash }) =>
    gitCollection.getDiff(collectionPath, { filePath, source, commitHash })
  );
  ipcMain.handle('renderer:git-blame', (event, { collectionPath, filePath }) => gitCollection.getBlame(collectionPath, filePath));
  ipcMain.handle('renderer:git-sync', (event, { collectionPath, action }) => gitCollection.sync(mainWindow, collectionPath, action));
  ipcMain.handle('renderer:git-abort-merge', (event, { collectionPath }) => gitCollection.abortMerge(collectionPath));
  ipcMain.handle('renderer:git-stash-list', (event, { collectionPath }) => gitCollection.listStashes(collectionPath));
  ipcMain.handle('renderer:git-stash-create', (event, { collectionPath, message }) => gitCollection.createStash(collectionPath, message));
  ipcMain.handle('renderer:git-stash-apply', (event, { collectionPath, index }) => gitCollection.applyStash(collectionPath, index));
  ipcMain.handle('renderer:git-stash-drop', (event, { collectionPath, index }) => gitCollection.dropStash(collectionPath, index));
};

module.exports = registerGitCollectionIpc;
