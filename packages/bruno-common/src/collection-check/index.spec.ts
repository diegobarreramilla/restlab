import { checkCollection } from './index';

const request = (name: string, overrides: any = {}) => ({
  uid: `uid-${name}`,
  name,
  type: 'http-request',
  request: { url: 'https://api.test/users', headers: [], params: [], ...overrides }
});

const folder = (name: string, items: any[], vars: any[] = []) => ({
  uid: `uid-${name}`,
  name,
  type: 'folder',
  items,
  root: { request: { vars: { req: vars } } }
});

const env = (name: string, names: string[], extra: any = {}) => ({
  uid: `env-${name}`,
  name,
  variables: names.map((variable) => ({ name: variable, value: 'x', enabled: true })),
  ...extra
});

const kinds = (findings: any[]) => findings.map((finding) => finding.kind);

describe('checkCollection', () => {
  it('finds nothing in a healthy collection', () => {
    const collection = {
      environments: [env('dev', ['host', 'token']), env('prod', ['host', 'token'])],
      items: [
        request('list', { url: '{{host}}/users', headers: [{ name: 'Authorization', value: 'Bearer {{token}}', enabled: true }] }),
        folder('admin', [request('stats', { url: '{{host}}/{{section}}' })], [{ name: 'section', value: 'stats', enabled: true }])
      ]
    };

    expect(checkCollection(collection)).toEqual([]);
  });

  it('reports a variable that nothing defines, once per request, saying where', () => {
    const collection = {
      items: [folder('users', [request('list', { url: '{{baseUrl}}/users?x={{baseUrl}}', body: { json: '{"id": "{{userId}}"}' } })])]
    };

    expect(checkCollection(collection)).toEqual([
      { kind: 'undefined-variable', location: { type: 'request', uid: 'uid-list' }, path: ['users', 'list'], name: 'baseUrl' },
      { kind: 'undefined-variable', location: { type: 'request', uid: 'uid-list' }, path: ['users', 'list'], name: 'userId' }
    ]);
  });

  it('reads the variable behind a path like {{user.id}} and leaves dynamic and prompt ones alone', () => {
    const collection = {
      items: [request('one', { url: 'https://a.test/{{user.id}}/{{$randomInt}}/{{?ask}}/{{process.env.KEY}}/{{ 1 + 1 }}' })]
    };

    expect(checkCollection(collection).map((finding) => finding.name)).toEqual(['user']);
  });

  it('counts as defined what a script or a post-response variable sets anywhere in the collection', () => {
    const collection = {
      items: [
        request('login', { script: { res: 'bru.setVar("token", res.body.token);\nbru.setEnvVar(\'session\', 1)' }, vars: { res: [{ name: 'userId', value: 'res.body.id', enabled: true }] } }),
        request('me', { url: 'https://a.test/{{userId}}?s={{session}}', headers: [{ name: 'X-Token', value: '{{token}}', enabled: true }] })
      ]
    };

    expect(checkCollection(collection)).toEqual([]);
  });

  it('counts collection variables, request variables and names defined outside the collection', () => {
    const collection = {
      root: { request: { vars: { req: [{ name: 'host', value: 'a.test', enabled: true }] } } },
      items: [request('one', { url: '{{host}}/{{id}}/{{tenant}}', vars: { req: [{ name: 'id', value: '1', enabled: true }] } })]
    };

    expect(checkCollection(collection, { externalVariableNames: ['tenant'] })).toEqual([]);
  });

  it('does not let a folder variable define anything outside that folder', () => {
    const collection = {
      items: [
        folder('admin', [request('inside', { url: '{{section}}' })], [{ name: 'section', value: 's', enabled: true }]),
        request('outside', { url: '{{section}}' })
      ]
    };

    expect(checkCollection(collection).map((finding) => finding.path)).toEqual([['outside']]);
  });

  it('ignores disabled headers and a disabled definition', () => {
    const collection = {
      items: [
        request('one', { headers: [{ name: 'X-Off', value: '{{ghost}}', enabled: false }] }),
        request('two', { url: '{{id}}', vars: { req: [{ name: 'id', value: '1', enabled: false }] } })
      ]
    };

    expect(checkCollection(collection).map((finding) => [finding.path[0], finding.name])).toEqual([['two', 'id']]);
  });

  it('reports once a variable that some environments lack, naming them', () => {
    const collection = {
      environments: [env('dev', ['host', 'token']), env('staging', ['host']), env('prod', ['host'])],
      items: [request('a', { url: '{{host}}/a?t={{token}}' }), request('b', { url: '{{host}}/b?t={{token}}' })]
    };

    expect(checkCollection(collection)).toEqual([
      { kind: 'variable-missing-in-environments', location: { type: 'environment' }, path: ['Environments'], name: 'token', environments: ['staging', 'prod'] }
    ]);
  });

  it('counts the variables an environment inherits', () => {
    const collection = {
      environments: [env('base', ['host']), env('dev', ['token'], { extends: 'base' })],
      items: [request('a', { url: '{{host}}' })]
    };

    expect(checkCollection(collection)).toEqual([]);
  });

  it('reports a request without a URL', () => {
    const findings = checkCollection({ items: [request('blank', { url: '   ' }), { uid: 'js', name: 'helper', type: 'js' }] });

    expect(findings).toEqual([{ kind: 'empty-url', location: { type: 'request', uid: 'uid-blank' }, path: ['blank'] }]);
  });

  it('reports requests that share a name in the same folder, not across folders', () => {
    const collection = {
      items: [
        folder('users', [request('list'), { ...request('List'), uid: 'second' }, request('get')]),
        folder('orders', [request('list')])
      ]
    };

    expect(checkCollection(collection)).toEqual([
      { kind: 'duplicate-name', location: { type: 'request', uid: 'uid-list' }, path: ['users'], name: 'list', count: 2 }
    ]);
  });

  it('does not call a variable undefined while part of the collection is not loaded', () => {
    const collection = {
      items: [request('one', { url: '{{maybeSetByAScript}}' }), { uid: 'big', name: 'big', type: 'http-request', partial: true }]
    };

    expect(kinds(checkCollection(collection))).toEqual([]);
  });

  it('checks folder and collection settings too', () => {
    const collection = {
      root: { request: { headers: [{ name: 'X-Tenant', value: '{{tenant}}', enabled: true }] } },
      items: [{ ...folder('admin', []), root: { request: { auth: { mode: 'bearer', bearer: { token: '{{adminToken}}' } } } } }]
    };

    expect(checkCollection(collection).map((finding) => [finding.location.type, finding.name])).toEqual([
      ['collection', 'tenant'],
      ['folder', 'adminToken']
    ]);
  });

  it('returns nothing without a collection', () => {
    expect(checkCollection(null)).toEqual([]);
  });
});
