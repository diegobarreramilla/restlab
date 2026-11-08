const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('electron', () => ({ ipcMain: { handle: jest.fn() } }));

const { readApiDocsAssets } = require('./api-docs-assets');

describe('readApiDocsAssets', () => {
  let dir;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-docs-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('reads the script and stylesheet from the first folder that has them', () => {
    fs.writeFileSync(path.join(dir, 'api-docs.js'), 'js');
    fs.writeFileSync(path.join(dir, 'api-docs.css'), 'css');
    expect(readApiDocsAssets([path.join(dir, 'nope'), dir])).toEqual({ js: 'js', css: 'css' });
  });

  it('fails loudly instead of producing a page that needs the network', () => {
    expect(() => readApiDocsAssets([path.join(dir, 'nope')])).toThrow(/missing/);
  });

  it('ships the real viewer files in the repository', () => {
    const assets = readApiDocsAssets();
    expect(assets.js.length).toBeGreaterThan(1000000);
    expect(assets.css.length).toBeGreaterThan(1000);
  });
});
