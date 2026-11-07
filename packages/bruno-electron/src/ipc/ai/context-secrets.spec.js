// Secrets that the name-based redaction cannot see: a credential typed straight into a URL, a body
// or a header with an ordinary name. None of these may reach the model provider.
const { isSensitiveName, formatRequestContext } = require('./context');

const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
const OPENAI_KEY = 'sk-proj-abcdefghijklmnopqrstuvwxyz0123456789';
const GITHUB_TOKEN = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789';
const AWS_KEY = 'AKIAIOSFODNN7EXAMPLE';
const STRIPE_KEY = 'sk_live_abcdefghijklmnopqrstuv';

const render = (ctx, opts) => formatRequestContext(ctx, opts);

describe('names the pattern list used to miss', () => {
  it.each([
    ['X-Auth'],
    ['auth'],
    ['jwt'],
    ['X-Session-Id'],
    ['sessionid'],
    ['signature'],
    ['X-Amz-Signature'],
    ['credentials'],
    ['private_key'],
    ['passwd'],
    ['pwd'],
    ['bearer']
  ])('flags %s as sensitive', (name) => {
    expect(isSensitiveName(name)).toBe(true);
  });

  it.each([
    ['Content-Type'],
    ['Accept'],
    ['author'],
    ['authority'],
    ['X-Request-Id'],
    ['User-Agent']
  ])('does not flag the ordinary name %s', (name) => {
    expect(isSensitiveName(name)).toBe(false);
  });
});

describe('credentials typed into the URL', () => {
  it('masks the values of sensitive query parameters in the URL itself', () => {
    const out = render({ method: 'GET', url: 'https://api.example.com/v1/items?page=2&api_key=hunter2&token=abc123' });

    expect(out).not.toContain('hunter2');
    expect(out).not.toContain('abc123');
    expect(out).toContain('page=2');
    expect(out).toContain('api_key=<redacted>');
  });

  it('masks a password embedded as user:password@host', () => {
    const out = render({ method: 'GET', url: 'https://admin:s3cretpw@db.example.com/stats' });

    expect(out).not.toContain('s3cretpw');
    expect(out).toContain('db.example.com/stats');
  });

  it('masks secret-looking values under ordinary parameter names', () => {
    const out = render({ method: 'GET', url: `https://api.example.com/cb?state=${JWT}` });

    expect(out).not.toContain(JWT);
  });

  it('leaves {{variable}} references and clean URLs untouched', () => {
    const url = '{{baseUrl}}/users/:id?sort=name&token={{apiToken}}';

    expect(render({ method: 'GET', url })).toContain('{{baseUrl}}/users/:id?sort=name&token=');
    expect(render({ method: 'GET', url: 'https://api.example.com/users?limit=10' })).toContain('?limit=10');
  });
});

describe('secret-looking values under ordinary names', () => {
  it.each([
    ['a JWT', JWT],
    ['an OpenAI style key', OPENAI_KEY],
    ['a GitHub token', GITHUB_TOKEN],
    ['an AWS access key id', AWS_KEY],
    ['a Stripe key', STRIPE_KEY]
  ])('masks %s in a JSON body field with a harmless name', (_label, secret) => {
    const out = render({
      method: 'POST',
      url: 'https://api.example.com/things',
      body: { mode: 'json', json: JSON.stringify({ name: 'widget', data: secret, nested: { note: secret } }) }
    });

    expect(out).not.toContain(secret);
    expect(out).toContain('widget');
  });

  it('masks a bearer token in a header with an ordinary name', () => {
    const out = render({
      method: 'GET',
      url: 'https://api.example.com/me',
      headers: [{ enabled: true, name: 'X-Forwarded-For-User', value: `Bearer ${JWT}` }]
    });

    expect(out).not.toContain(JWT);
    expect(out).toContain('X-Forwarded-For-User');
  });

  it('masks secret-looking values in query parameters and form fields', () => {
    const out = render({
      method: 'POST',
      url: 'https://api.example.com/submit',
      params: [{ enabled: true, name: 'ref', value: GITHUB_TOKEN, type: 'query' }],
      body: { mode: 'formUrlEncoded', formUrlEncoded: [{ enabled: true, name: 'note', value: OPENAI_KEY }] }
    });

    expect(out).not.toContain(GITHUB_TOKEN);
    expect(out).not.toContain(OPENAI_KEY);
  });
});

describe('bodies that are not JSON', () => {
  it('masks secret-looking values in a text body', () => {
    const out = render({ method: 'POST', url: 'https://x.test', body: { mode: 'text', text: `deploy with ${OPENAI_KEY} now` } });

    expect(out).not.toContain(OPENAI_KEY);
    expect(out).toContain('deploy with');
  });

  it('masks key=value and key: value pairs whose key is sensitive', () => {
    const out = render({
      method: 'POST',
      url: 'https://x.test',
      body: { mode: 'text', text: 'user=ana\npassword=hunter2\nclient_secret: shh-its-a-secret\nregion=eu' }
    });

    expect(out).not.toContain('hunter2');
    expect(out).not.toContain('shh-its-a-secret');
    expect(out).toContain('user=ana');
    expect(out).toContain('region=eu');
  });

  it('masks the content of sensitive XML elements', () => {
    const out = render({
      method: 'POST',
      url: 'https://x.test',
      body: { mode: 'xml', xml: '<login><user>ana</user><password>hunter2</password></login>' }
    });

    expect(out).not.toContain('hunter2');
    expect(out).toContain('<user>ana</user>');
  });

  it('masks a PEM private key block', () => {
    const pem = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----';
    const out = render({ method: 'POST', url: 'https://x.test', body: { mode: 'text', text: `key:\n${pem}` } });

    expect(out).not.toContain('MIIEvQIBADANBgkqhkiG9w0BAQEFAASC');
  });

  it('masks secret-looking values in GraphQL queries and variables', () => {
    const out = render({
      method: 'POST',
      url: 'https://x.test/graphql',
      body: { mode: 'graphql', graphql: { query: `query { user(token: "${GITHUB_TOKEN}") { id } }`, variables: JSON.stringify({ k: OPENAI_KEY }) } }
    });

    expect(out).not.toContain(GITHUB_TOKEN);
    expect(out).not.toContain(OPENAI_KEY);
  });
});

describe('ordinary content is left alone', () => {
  it('keeps plain prose, ids and URLs readable', () => {
    const out = render({
      method: 'POST',
      url: 'https://api.example.com/orders/8f14e45f-ceea-467f-a0e6-4d0b1c8b3a2f?limit=10',
      headers: [{ enabled: true, name: 'Content-Type', value: 'application/json' }],
      body: { mode: 'text', text: 'Basic authentication is documented in the guide. The sessionless endpoint returns 204.' },
      docs: 'Use Basic authentication for the legacy endpoint.'
    });

    expect(out).toContain('orders/8f14e45f-ceea-467f-a0e6-4d0b1c8b3a2f?limit=10');
    expect(out).toContain('application/json');
    expect(out).toContain('Basic authentication is documented in the guide.');
    expect(out).toContain('The sessionless endpoint returns 204.');
    expect(out).toContain('Use Basic authentication for the legacy endpoint.');
  });

  it('keeps ordinary JSON values and variable references in values', () => {
    const out = render({
      method: 'POST',
      url: 'https://x.test',
      body: { mode: 'json', json: JSON.stringify({ name: 'widget', count: 3, link: 'https://x.test/a', auth: '{{authValue}}' }) }
    });

    expect(out).toContain('"name": "widget"');
    expect(out).toContain('"count": 3');
    expect(out).toContain('"link": "https://x.test/a"');
  });

  it('keeps variable references after a sensitive word in free text', () => {
    const out = render({ method: 'POST', url: 'https://x.test', body: { mode: 'text', text: 'password={{userPassword}}' } });

    expect(out).toContain('password={{userPassword}}');
  });
});

describe('the user keeps control through the security toggles', () => {
  it('leaves URL and header values alone when header redaction is off', () => {
    const out = render(
      { method: 'GET', url: 'https://x.test/a?api_key=hunter2', headers: [{ enabled: true, name: 'X-Thing', value: `Bearer ${JWT}` }] },
      { security: { redactHeaders: false } }
    );

    expect(out).toContain('hunter2');
    expect(out).toContain(JWT);
  });

  it('leaves body content alone when body redaction is off', () => {
    const out = render(
      { method: 'POST', url: 'https://x.test', body: { mode: 'text', text: `password=hunter2 ${OPENAI_KEY}` } },
      { security: { redactBody: false } }
    );

    expect(out).toContain('hunter2');
    expect(out).toContain(OPENAI_KEY);
  });
});
