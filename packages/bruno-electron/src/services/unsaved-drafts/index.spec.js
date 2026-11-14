const fs = require('fs');
const os = require('os');
const path = require('path');
const { createUnsavedDraftsStore } = require('./index');

describe('unsaved drafts store', () => {
  let directory;
  let store;
  const requestPath = path.join(os.tmpdir(), 'collection', 'users.yml');
  const entry = { base: { url: 'https://a.test' }, draft: { url: 'https://a.test/edited' } };

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'unsaved-drafts-'));
    store = createUnsavedDraftsStore(directory);
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('is empty before anything is written', () => {
    expect(store.read()).toEqual({});
  });

  it('gives back what was written', () => {
    store.write({ [requestPath]: entry });

    expect(createUnsavedDraftsStore(directory).read()).toEqual({ [requestPath]: entry });
  });

  it('removes the file when there is nothing left to keep', () => {
    store.write({ [requestPath]: entry });
    store.write({});

    expect(fs.readdirSync(directory)).toEqual([]);
  });

  it('drops entries that are not a request path with its two versions', () => {
    store.write({
      [requestPath]: entry,
      'relative/path.yml': entry,
      [path.join(os.tmpdir(), 'no-draft.yml')]: { base: {} },
      [path.join(os.tmpdir(), 'not-an-object.yml')]: 'text'
    });

    expect(Object.keys(store.read())).toEqual([requestPath]);
  });

  it('reads a damaged file as empty', () => {
    fs.writeFileSync(path.join(directory, 'unsaved-drafts.json'), '{"drafts": {');

    expect(store.read()).toEqual({});
  });

  it('leaves no temporary file behind', () => {
    store.write({ [requestPath]: entry });

    expect(fs.readdirSync(directory)).toEqual(['unsaved-drafts.json']);
  });
});
