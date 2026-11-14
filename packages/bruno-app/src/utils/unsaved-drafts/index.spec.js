import { collectUnsavedDrafts, planDraftRestore } from './index';

const request = (url, uid = 'h1') => ({ method: 'GET', url, headers: [{ uid, name: 'Accept', value: '*/*', enabled: true }] });

const item = (name, overrides = {}) => ({
  uid: `uid-${name}`,
  name,
  type: 'http-request',
  pathname: `/work/api/${name}.yml`,
  request: request('https://a.test'),
  ...overrides
});

const collectionOf = (...items) => [{ uid: 'col-1', items }];

describe('collectUnsavedDrafts', () => {
  it('keeps the saved and the edited version of each request with unsaved changes', () => {
    const edited = item('edited', { draft: { request: request('https://a.test/new'), settings: { timeout: 5 } } });
    const drafts = collectUnsavedDrafts(collectionOf(edited, item('untouched')));

    expect(Object.keys(drafts)).toEqual(['/work/api/edited.yml']);
    expect(drafts['/work/api/edited.yml'].draft).toEqual({ request: request('https://a.test/new'), settings: { timeout: 5 } });
    expect(drafts['/work/api/edited.yml'].base.headers[0]).toEqual({ name: 'Accept', value: '*/*', enabled: true });
  });

  it('finds requests inside folders', () => {
    const inner = item('inner', { draft: { request: request('x') } });
    const folder = { uid: 'f', type: 'folder', name: 'f', pathname: '/work/api/f', items: [inner] };

    expect(Object.keys(collectUnsavedDrafts(collectionOf(folder)))).toEqual(['/work/api/inner.yml']);
  });

  it('leaves out requests that were never saved to the collection or are not loaded', () => {
    const drafts = collectUnsavedDrafts(collectionOf(
      item('transient', { isTransient: true, draft: { request: request('x') } }),
      item('partial', { partial: true, draft: { request: request('x') } }),
      { uid: 'folder', type: 'folder', name: 'f', pathname: '/work/api/f', items: [], draft: {} }
    ));

    expect(drafts).toEqual({});
  });
});

describe('planDraftRestore', () => {
  const kept = (base, url) => ({ base, draft: { request: request(url) } });
  const baseOf = (url) => collectUnsavedDrafts(collectionOf(item('x', { request: request(url), draft: { request: request('y') } })))['/work/api/x.yml'].base;

  it('puts a draft back on its request when the file is as the draft left it, whatever the new uids', () => {
    const pending = { '/work/api/users.yml': kept(baseOf('https://a.test'), 'https://a.test/edited') };
    const loaded = item('users', { request: request('https://a.test', 'another-uid') });

    expect(planDraftRestore(pending, collectionOf(loaded))).toEqual({
      restores: [{ collectionUid: 'col-1', itemUid: 'uid-users', draft: { request: request('https://a.test/edited') } }],
      settled: ['/work/api/users.yml']
    });
  });

  it('drops a draft whose file changed in the meantime', () => {
    const pending = { '/work/api/users.yml': kept(baseOf('https://a.test'), 'https://a.test/edited') };
    const loaded = item('users', { request: request('https://changed.test') });

    expect(planDraftRestore(pending, collectionOf(loaded))).toEqual({ restores: [], settled: ['/work/api/users.yml'] });
  });

  it('does not replace changes already being made', () => {
    const pending = { '/work/api/users.yml': kept(baseOf('https://a.test'), 'https://a.test/edited') };
    const loaded = item('users', { draft: { request: request('https://a.test/now') } });

    expect(planDraftRestore(pending, collectionOf(loaded)).restores).toEqual([]);
  });

  it('keeps waiting for a request that is not loaded yet', () => {
    const pending = { '/work/api/users.yml': kept(baseOf('https://a.test'), 'x'), '/work/api/later.yml': kept(baseOf('https://a.test'), 'x') };
    const plan = planDraftRestore(pending, collectionOf(item('users', { partial: true })));

    expect(plan).toEqual({ restores: [], settled: [] });
  });

  it('does nothing without kept drafts', () => {
    expect(planDraftRestore({}, collectionOf(item('users')))).toEqual({ restores: [], settled: [] });
  });
});
