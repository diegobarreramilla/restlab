import { findSecretsInCollection } from './index';

const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const GITHUB = `ghp_${'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8'}`;

const request = (overrides: any = {}) => ({
  type: 'http-request',
  name: 'r',
  request: { url: 'https://api.example.com', headers: [], params: [], auth: { mode: 'none' }, ...overrides }
});

const collection = (extra: any = {}) => ({ environments: [], root: {}, items: [], ...extra });

describe('findSecretsInCollection', () => {
  it('returns nothing for an empty or missing collection', () => {
    expect(findSecretsInCollection(null)).toEqual([]);
    expect(findSecretsInCollection(collection())).toEqual([]);
  });

  describe('by the shape of the value', () => {
    it.each([
      ['a JWT', JWT, 'jwt'],
      ['a GitHub token', GITHUB, 'provider-token'],
      ['an AWS access key id', 'AKIAIOSFODNN7EXAMPLE', 'provider-token'],
      ['a private key block', '-----BEGIN RSA PRIVATE KEY-----\nabc', 'private-key']
    ])('flags %s in a harmless-looking header', (_label, value, kind) => {
      const found = findSecretsInCollection(collection({ items: [request({ headers: [{ name: 'X-Trace', value, enabled: true }] })] }));

      expect(found).toEqual([{ kind, severity: 'high', path: ['r'], field: 'X-Trace' }]);
    });

    it('flags a password written into the URL', () => {
      const found = findSecretsInCollection(collection({ items: [request({ url: 'postgres://admin:hunter2pass@db.local/app' })] }));

      expect(found).toEqual([{ kind: 'password-in-url', severity: 'high', path: ['r'], field: 'url' }]);
    });

    it('does not flag a URL whose password is a variable', () => {
      expect(findSecretsInCollection(collection({ items: [request({ url: 'postgres://admin:{{dbPassword}}@db.local/app' })] }))).toEqual([]);
    });
  });

  describe('by the role of the field', () => {
    it('flags a literal bearer token, a literal basic password and a literal api key', () => {
      const items = [
        request({ auth: { mode: 'bearer', bearer: { token: 'abc123def456' } } }),
        request({ auth: { mode: 'basic', basic: { username: 'me', password: 'correct-horse' } } }),
        request({ auth: { mode: 'apikey', apikey: { key: 'X-Key', value: 'k_1234567890' } } })
      ];

      const fields = findSecretsInCollection(collection({ items })).map((f) => f.field);

      expect(fields).toEqual(['auth.bearer.token', 'auth.basic.password', 'auth.apikey.value']);
    });

    it('flags a literal Authorization header but not one that uses a variable', () => {
      const literal = request({ headers: [{ name: 'Authorization', value: 'Bearer abcdef123456', enabled: true }] });
      const reference = request({ headers: [{ name: 'Authorization', value: 'Bearer {{token}}', enabled: true }] });

      expect(findSecretsInCollection(collection({ items: [literal] })).map((f) => f.kind)).toEqual(['plain-credential']);
      expect(findSecretsInCollection(collection({ items: [reference] }))).toEqual([]);
    });

    it('does not flag credentials that are variables, empty or placeholders', () => {
      const items = [
        request({ auth: { mode: 'bearer', bearer: { token: '{{token}}' } } }),
        request({ auth: { mode: 'basic', basic: { password: '' } } }),
        request({ auth: { mode: 'bearer', bearer: { token: '<your-token>' } } }),
        request({ auth: { mode: 'bearer', bearer: { token: 'changeme' } } })
      ];

      expect(findSecretsInCollection(collection({ items }))).toEqual([]);
    });

    it('ignores disabled headers', () => {
      const items = [request({ headers: [{ name: 'Authorization', value: 'Bearer abcdef123456', enabled: false }] })];

      expect(findSecretsInCollection(collection({ items }))).toEqual([]);
    });
  });

  describe('environments', () => {
    const env = (variables: any[]) => collection({ environments: [{ name: 'dev', variables }] });

    it('flags a sensitive-looking variable that is not marked secret', () => {
      const found = findSecretsInCollection(env([{ name: 'apiKey', value: 'k_live_1234567', secret: false, enabled: true }]));

      expect(found).toEqual([{ kind: 'unmarked-environment-secret', severity: 'medium', path: ['Environment', 'dev'], field: 'apiKey' }]);
    });

    it('does not flag a variable already marked secret, even with a token-shaped value', () => {
      expect(findSecretsInCollection(env([{ name: 'apiKey', value: GITHUB, secret: true, enabled: true }]))).toEqual([]);
    });

    it('does not flag ordinary variables', () => {
      expect(findSecretsInCollection(env([
        { name: 'baseUrl', value: 'https://api.example.com', secret: false, enabled: true },
        { name: 'userId', value: '42', secret: false, enabled: true }
      ]))).toEqual([]);
    });

    it.each([['access_token_url'], ['accessTokenUrl'], ['token_type'], ['password_header']])(
      'does not flag %s, which mentions a credential without being one',
      (name) => {
        expect(findSecretsInCollection(env([{ name, value: 'https://auth.example.com/oauth/token', secret: false, enabled: true }]))).toEqual([]);
      }
    );

    it('flags a token-shaped value in a variable with an innocent name', () => {
      const found = findSecretsInCollection(env([{ name: 'session', value: JWT, secret: false, enabled: true }]));

      expect(found.map((f) => f.kind)).toEqual(['jwt']);
    });
  });

  it('walks folders and reports the path to the finding', () => {
    const folder = {
      type: 'folder',
      name: 'users',
      root: { request: { headers: [{ name: 'X-Api-Key', value: 'abcd-1234-efgh', enabled: true }] } },
      items: [{ ...request({ auth: { mode: 'bearer', bearer: { token: 'abc123def456' } } }), name: 'list' }]
    };

    const found = findSecretsInCollection(collection({ items: [folder] }));

    expect(found.map((f) => f.path)).toEqual([['users'], ['users', 'list']]);
  });

  it('never repeats the value in a finding', () => {
    const found = findSecretsInCollection(collection({ items: [request({ headers: [{ name: 'X-Trace', value: JWT, enabled: true }] })] }));

    expect(JSON.stringify(found)).not.toContain(JWT);
  });

  it('does not produce a finding for a typical clean collection', () => {
    const items = [
      request({
        url: '{{baseUrl}}/users?limit=10',
        headers: [{ name: 'Content-Type', value: 'application/json', enabled: true }, { name: 'Accept', value: '*/*', enabled: true }],
        params: [{ name: 'page', value: '1', enabled: true }],
        auth: { mode: 'bearer', bearer: { token: '{{accessToken}}' } }
      })
    ];

    expect(findSecretsInCollection(collection({ items, environments: [{ name: 'dev', variables: [{ name: 'baseUrl', value: 'http://localhost:3000', secret: false, enabled: true }] }] }))).toEqual([]);
  });
});
