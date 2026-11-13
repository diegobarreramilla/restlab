import { describeRepositoryFile, repositoryPathOfItem, describeBlameField, leafBlameFields } from './index';

const overview = { gitRootPath: '/repo/', collectionPrefix: 'apis/billing' };
const collection = {
  items: [
    { name: 'users', type: 'folder', pathname: '/repo/apis/billing/users', items: [{ name: 'List users', type: 'http-request', pathname: '/repo/apis/billing/users/list.yml' }] }
  ]
};

describe('describeRepositoryFile', () => {
  it('names a request file after the request and shows its path inside the collection', () => {
    const described = describeRepositoryFile(collection, overview, 'apis/billing/users/list.yml');

    expect(described).toMatchObject({ name: 'List users', pathInCollection: 'users/list.yml' });
    expect(described.item.name).toBe('List users');
  });

  it('falls back to the file name for a file that is not a loaded item', () => {
    expect(describeRepositoryFile(collection, overview, 'apis/billing/opencollection.yml')).toEqual({
      name: 'opencollection.yml',
      pathInCollection: 'opencollection.yml',
      item: null
    });
  });

  it('works when the collection is the repository itself', () => {
    const own = { gitRootPath: '/repo/apis/billing/', collectionPrefix: '' };

    expect(describeRepositoryFile(collection, own, 'users/list.yml').name).toBe('List users');
  });
});

describe('repositoryPathOfItem', () => {
  it('gives the path git uses, or null for an item outside the repository', () => {
    expect(repositoryPathOfItem(overview, { pathname: '/repo/apis/billing/users/list.yml' })).toBe('apis/billing/users/list.yml');
    expect(repositoryPathOfItem(overview, { pathname: '/elsewhere/list.yml' })).toBeNull();
  });
});

describe('describeBlameField', () => {
  it.each([
    ['http.url', 'URL'],
    ['http.method', 'Method'],
    ['http.headers[Accept]', 'Header Accept'],
    ['http.params[page]', 'Parameter page'],
    ['info.name', 'Name'],
    ['http.auth', 'Auth'],
    ['get.url', 'URL'],
    ['headers.Accept', 'Header Accept'],
    ['params:query.page', 'Parameter page'],
    ['body:json', 'Body'],
    ['meta.name', 'Name'],
    ['docs', 'Docs']
  ])('describes %s as %s', (field, expected) => {
    expect(describeBlameField(field)).toBe(expected);
  });
});

describe('leafBlameFields', () => {
  it('keeps the fields and drops the rows that only contain other rows', () => {
    const fields = ['http', 'http.url', 'http.headers', 'http.headers[Accept]', 'docs'].map((field) => ({ field }));

    expect(leafBlameFields(fields).map((row) => row.field)).toEqual(['http.url', 'http.headers[Accept]', 'docs']);
  });
});

describe('layoutCommitGraph', () => {
  const { layoutCommitGraph } = require('./index');
  const commit = (hash, ...parents) => ({ hash, parents });
  const shape = ({ rows }) => rows.map(({ commit: { hash }, lane, from, through, to }) => ({ hash, lane, from, through, to }));

  it('keeps a straight history on one lane', () => {
    const graph = layoutCommitGraph([commit('c', 'b'), commit('b', 'a'), commit('a')]);

    expect(graph.laneCount).toBe(1);
    expect(shape(graph)).toEqual([
      { hash: 'c', lane: 0, from: [], through: [], to: [0] },
      { hash: 'b', lane: 0, from: [0], through: [], to: [0] },
      { hash: 'a', lane: 0, from: [0], through: [], to: [] }
    ]);
  });

  it('opens a lane for a merged branch and closes it where the branch started', () => {
    // m merges f into x; both x and f come from a.
    const graph = layoutCommitGraph([commit('m', 'x', 'f'), commit('x', 'a'), commit('f', 'a'), commit('a')]);

    expect(graph.laneCount).toBe(2);
    expect(shape(graph)).toEqual([
      { hash: 'm', lane: 0, from: [], through: [], to: [0, 1] },
      { hash: 'x', lane: 0, from: [0], through: [1], to: [0] },
      { hash: 'f', lane: 1, from: [1], through: [0], to: [0] },
      { hash: 'a', lane: 0, from: [0], through: [], to: [] }
    ]);
  });

  it('gives a second branch tip its own lane and joins both at the common commit', () => {
    const graph = layoutCommitGraph([commit('t1', 'a'), commit('t2', 'a'), commit('a')]);

    expect(shape(graph)).toEqual([
      { hash: 't1', lane: 0, from: [], through: [], to: [0] },
      { hash: 't2', lane: 1, from: [], through: [0], to: [0] },
      { hash: 'a', lane: 0, from: [0], through: [], to: [] }
    ]);
  });

  it('reuses a lane that was freed', () => {
    const graph = layoutCommitGraph([commit('m', 'x', 'f'), commit('f', 'a'), commit('x', 'a'), commit('y'), commit('a')]);

    // x joins a on lane 1 and leaves lane 0 empty; the unrelated commit y takes it instead of opening a third.
    expect(graph.laneCount).toBe(2);
    expect(shape(graph).find((row) => row.hash === 'y')).toMatchObject({ lane: 0, through: [1] });
    expect(shape(graph).find((row) => row.hash === 'a').lane).toBe(1);
  });

  it('handles an empty history', () => {
    expect(layoutCommitGraph([])).toEqual({ rows: [], laneCount: 0 });
  });
});

describe('describeRemote', () => {
  const { describeRemote } = require('./index');

  it.each([
    ['https://github.com/acme/billing-api.git', { service: 'GitHub', host: 'github.com', project: 'acme/billing-api' }],
    ['git@gitlab.com:acme/platform/billing-api.git', { service: 'GitLab', host: 'gitlab.com', project: 'acme/platform/billing-api' }],
    ['ssh://git@bitbucket.org/acme/billing-api', { service: 'Bitbucket', host: 'bitbucket.org', project: 'acme/billing-api' }],
    ['https://git.acme.internal/team/billing-api.git', { service: 'git.acme.internal', host: 'git.acme.internal', project: 'team/billing-api' }]
  ])('reads %s', (url, expected) => {
    expect(describeRemote(url)).toEqual(expected);
  });

  it('shows a local folder as it is', () => {
    expect(describeRemote('/srv/git/billing-api')).toEqual({ service: null, host: null, project: '/srv/git/billing-api' });
  });

  it('has nothing to say without a remote', () => {
    expect(describeRemote(null)).toBeNull();
  });
});

describe('conflict parts', () => {
  const { describeConflictPart, suggestConflictChoices } = require('./index');

  it('names the parts as the app does and falls back to the key', () => {
    expect(describeConflictPart('request.url')).toBe('URL');
    expect(describeConflictPart('request.script')).toBe('Scripts');
    expect(describeConflictPart('something.new')).toBe('something.new');
  });

  it('suggests the only side that changed a part and nothing for a part both changed', () => {
    const parts = [{ key: 'request.url', changedBy: 'both' }, { key: 'request.headers', changedBy: 'theirs' }, { key: 'name', changedBy: 'ours' }];

    expect(suggestConflictChoices(parts)).toEqual({ 'request.headers': 'theirs', 'name': 'ours' });
  });
});
