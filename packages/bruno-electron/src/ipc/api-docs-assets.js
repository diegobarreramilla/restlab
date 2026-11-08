const fs = require('fs');
const path = require('path');
const { ipcMain } = require('electron');

// The viewer that generated API docs embed. The files ship with the app (bruno-app/public/api-docs),
// so generating docs never asks a server for them.
const ASSET_DIRECTORIES = [
  path.join(__dirname, '../../web/api-docs'),
  path.join(__dirname, '../../../bruno-app/public/api-docs')
];

const readApiDocsAssets = (directories = ASSET_DIRECTORIES) => {
  for (const directory of directories) {
    try {
      return {
        js: fs.readFileSync(path.join(directory, 'api-docs.js'), 'utf8'),
        css: fs.readFileSync(path.join(directory, 'api-docs.css'), 'utf8')
      };
    } catch (error) {
      // try the next place
    }
  }
  throw new Error('The API docs viewer files are missing from this installation.');
};

const registerApiDocsAssetsIpc = () => {
  ipcMain.handle('renderer:get-api-docs-assets', () => readApiDocsAssets());
};

module.exports = registerApiDocsAssetsIpc;
module.exports.readApiDocsAssets = readApiDocsAssets;
