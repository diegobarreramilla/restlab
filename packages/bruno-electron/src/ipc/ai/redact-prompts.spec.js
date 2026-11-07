// The prompt builders are the last step before text leaves for a provider. These tests run them
// end to end with credentials planted in every place they read from.
const { buildScriptUserPrompt, formatDocsContext } = require('./script-prompts');
const { buildUserPrompt: buildAutocompletePrompt } = require('./autocomplete-prompts');
const { formatRequestsList, formatSearchRequestsResult, searchRequests } = require('./context');

const OPENAI_KEY = 'sk-proj-abcdefghijklmnopqrstuvwxyz0123456789';
const GITHUB_TOKEN = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789';

describe('generation prompt', () => {
  it('masks credentials inside the existing script, the request and the docs context', () => {
    const prompt = buildScriptUserPrompt({
      userPrompt: 'add a test',
      scriptType: 'tests',
      currentScript: `const apiKey = 'hunter2hunter2';\nconst other = '${OPENAI_KEY}';\nconst page = 2;`,
      requestContext: { method: 'GET', url: 'https://api.example.com/items?api_key=hunter2hunter2' },
      docsContext: {
        scope: 'collection',
        name: 'Shop',
        requests: [{ name: 'List', method: 'GET', url: `https://api.example.com/items?token=${GITHUB_TOKEN}` }]
      }
    });

    expect(prompt).not.toContain('hunter2hunter2');
    expect(prompt).not.toContain(OPENAI_KEY);
    expect(prompt).not.toContain(GITHUB_TOKEN);
    expect(prompt).toContain('const page = 2;');
    expect(prompt).toContain('User Request\nadd a test');
  });

  it('shows the code unchanged when body redaction is switched off', () => {
    const prompt = buildScriptUserPrompt({
      userPrompt: 'x',
      scriptType: 'tests',
      currentScript: 'const apiKey = \'hunter2hunter2\';',
      security: { redactBody: false }
    });

    expect(prompt).toContain('const apiKey = \'hunter2hunter2\';');
  });

  it('keeps names, methods and clean URLs in the docs context', () => {
    const out = formatDocsContext({
      scope: 'collection',
      name: 'Shop',
      requests: [{ name: 'List', method: 'GET', url: 'https://api.example.com/items?limit=10' }]
    });

    expect(out).toContain('- List: GET https://api.example.com/items?limit=10');
  });
});

describe('autocomplete prompt', () => {
  const build = (overrides = {}) => buildAutocompletePrompt({
    prefix: 'const token = \'hunter2hunter2\';\nconst res = await ',
    suffix: `\nconst other = '${OPENAI_KEY}';`,
    scriptType: 'pre-request',
    requestContext: {
      method: 'POST',
      url: 'https://api.example.com/login?password=hunter2hunter2',
      body: { mode: 'text', text: `grant=${GITHUB_TOKEN}\npassword=hunter2hunter2` }
    },
    siblingScripts: [{ name: 'Other request', type: 'pre-request', script: 'const secret = \'hunter2hunter2\';' }],
    ...overrides
  });

  it('masks credentials in the code around the cursor, the request and sibling scripts', () => {
    const prompt = build();

    expect(prompt).not.toContain('hunter2hunter2');
    expect(prompt).not.toContain(OPENAI_KEY);
    expect(prompt).not.toContain(GITHUB_TOKEN);
    expect(prompt).toContain('const res = await <CURSOR>');
  });

  it('follows the user switches', () => {
    const prompt = build({ security: { redactBody: false, redactHeaders: false } });

    expect(prompt).toContain('hunter2hunter2');
  });
});

describe('collection request lists', () => {
  const requests = [
    { name: 'List', method: 'GET', url: `https://api.example.com/items?api_key=hunter2hunter2&page=2`, pathname: 'items/list' },
    { name: 'Login', method: 'POST', url: 'https://admin:s3cretpw@db.example.com/login', pathname: 'auth/login' }
  ];

  it('masks credentials in the URLs of the list the assistant starts with', () => {
    const out = formatRequestsList(requests);

    expect(out).not.toContain('hunter2hunter2');
    expect(out).not.toContain('s3cretpw');
    expect(out).toContain('page=2');
  });

  it('masks credentials in the URLs returned by a search', () => {
    const out = formatSearchRequestsResult(searchRequests(requests, ''), '');

    expect(out).not.toContain('hunter2hunter2');
    expect(out).not.toContain('s3cretpw');
    expect(out).toContain('pathname: items/list');
  });

  it('still finds a request by a word that is only in its URL', () => {
    const result = searchRequests(requests, 'db.example.com');

    expect(result.items.map((r) => r.name)).toEqual(['Login']);
  });
});
