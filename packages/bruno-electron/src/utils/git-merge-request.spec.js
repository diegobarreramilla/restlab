const { listConflictParts, mergeRequestParts } = require('./git-merge-request');

const item = (request = {}, rest = {}) => ({
  uid: `uid-${Math.random()}`,
  name: 'list',
  seq: 1,
  tags: [],
  settings: null,
  examples: [],
  ...rest,
  request: {
    method: 'GET',
    url: 'https://base.example.com',
    headers: [{ uid: `h-${Math.random()}`, name: 'Accept', value: '*/*', enabled: true }],
    params: [],
    auth: { mode: 'none' },
    body: { mode: 'none' },
    tests: null,
    docs: null,
    ...request
  }
});

const header = (value) => [{ uid: `h-${Math.random()}`, name: 'Accept', value, enabled: true }];

describe('listConflictParts', () => {
  it('finds nothing between two parses of the same request, whose uids differ', () => {
    expect(listConflictParts({ base: item(), ours: item(), theirs: item() })).toEqual([]);
  });

  it('says who changed each part since the common version', () => {
    const base = item();
    const ours = item({ url: 'https://ours.example.com', tests: 'mine' });
    const theirs = item({ url: 'https://theirs.example.com', headers: header('application/json') });

    expect(listConflictParts({ base, ours, theirs })).toEqual([
      { key: 'request.url', changedBy: 'both' },
      { key: 'request.headers', changedBy: 'theirs' },
      { key: 'request.tests', changedBy: 'ours' }
    ]);
  });

  it('treats every difference as changed by both when there is no common version', () => {
    const parts = listConflictParts({ base: null, ours: item({ url: 'https://ours.example.com' }), theirs: item() });

    expect(parts).toEqual([{ key: 'request.url', changedBy: 'both' }]);
  });

  it('does not see a difference between an empty and a missing value', () => {
    expect(listConflictParts({ base: item(), ours: item({ docs: '' }), theirs: item({ docs: undefined }) })).toEqual([]);
  });

  it('covers the parts outside the request too', () => {
    const parts = listConflictParts({ base: item(), ours: item({}, { name: 'renamed' }), theirs: item({}, { tags: ['smoke'] }) });

    expect(parts).toEqual([{ key: 'name', changedBy: 'ours' }, { key: 'tags', changedBy: 'theirs' }]);
  });
});

describe('mergeRequestParts', () => {
  const sides = () => ({
    base: item(),
    ours: item({ url: 'https://ours.example.com', tests: 'mine' }),
    theirs: item({ url: 'https://theirs.example.com', headers: header('application/json') })
  });

  it('takes each part from the side chosen for it', () => {
    const merged = mergeRequestParts(sides(), { 'request.url': 'theirs', 'request.headers': 'theirs', 'request.tests': 'ours' });

    expect(merged.request.url).toBe('https://theirs.example.com');
    expect(merged.request.headers[0].value).toBe('application/json');
    expect(merged.request.tests).toBe('mine');
  });

  it('can keep the URL of one side and the headers of the other', () => {
    const merged = mergeRequestParts(sides(), { 'request.url': 'ours', 'request.headers': 'theirs', 'request.tests': 'ours' });

    expect(merged.request.url).toBe('https://ours.example.com');
    expect(merged.request.headers[0].value).toBe('application/json');
  });

  it('refuses to guess a part that was left undecided', () => {
    expect(() => mergeRequestParts(sides(), { 'request.url': 'theirs' })).toThrow('missing: request.headers');
    expect(() => mergeRequestParts(sides(), { 'request.url': 'neither', 'request.headers': 'ours', 'request.tests': 'ours' })).toThrow('missing: request.url');
  });

  it('does not modify the versions it was given', () => {
    const input = sides();
    const before = JSON.stringify(input);

    mergeRequestParts(input, { 'request.url': 'theirs', 'request.headers': 'theirs', 'request.tests': 'ours' });

    expect(JSON.stringify(input)).toBe(before);
  });
});
