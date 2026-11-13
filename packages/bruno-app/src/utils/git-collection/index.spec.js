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
