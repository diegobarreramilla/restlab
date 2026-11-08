// Scripts, tests, docs and app code are sent to the model as context, and users paste credentials
// into them too. Quoted literals under a sensitive-looking name and credential-shaped values must
// not reach the provider, while the code around them has to stay readable.
const { redactCodeContent, createCodeRedactor } = require('./context');

const OPENAI_KEY = 'sk-proj-abcdefghijklmnopqrstuvwxyz0123456789';
const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

describe('redactCodeContent', () => {
  it('masks a quoted literal assigned to a sensitive name and keeps the statement', () => {
    const out = redactCodeContent('const apiKey = \'abc123def\';\nconst page = 2;');

    expect(out).not.toContain('abc123def');
    expect(out).toContain('const apiKey = \'<redacted>\';');
    expect(out).toContain('const page = 2;');
  });

  it.each([
    ['double quotes', 'const password = "hunter2";'],
    ['backticks', 'const client_secret = `hunter2`;'],
    ['an object property', 'const body = { password: \'hunter2\' };'],
    ['a quoted JSON key', 'const body = { "password": "hunter2" };']
  ])('masks the literal in %s', (_label, code) => {
    expect(redactCodeContent(code)).not.toContain('hunter2');
  });

  it('cannot read a name from a plain string argument, so only its shape can give it away', () => {
    const code = 'req.setHeader(\'X-Session-Id\', \'hunter2\');';

    expect(redactCodeContent(code)).toBe(code);
  });

  it('masks credential-shaped values wherever they sit', () => {
    const code = `const headers = { 'X-Thing': '${OPENAI_KEY}' };\nfetch(url, { headers: { Authorization: 'Bearer ${JWT}' } });`;
    const out = redactCodeContent(code);

    expect(out).not.toContain(OPENAI_KEY);
    expect(out).not.toContain(JWT);
    expect(out).toContain('fetch(url');
  });

  it('keeps code that only reads a sensitive value, instead of assigning a literal', () => {
    const code = [
      'const token = await getToken();',
      'const password = req.body.password;',
      'const key = bru.getEnvVar(\'apiKey\');',
      'const secret = bru.getVar("secret");'
    ].join('\n');

    expect(redactCodeContent(code)).toBe(code);
  });

  it('keeps variable references and ordinary literals', () => {
    const code = 'const apiKey = \'{{apiKey}}\';\nconst name = \'widget\';\nres.setHeader(\'Content-Type\', \'application/json\');';

    expect(redactCodeContent(code)).toBe(code);
  });

  it('leaves everything alone when body redaction is turned off', () => {
    const code = 'const apiKey = \'abc123def\';';

    expect(redactCodeContent(code, { redactBody: false })).toBe(code);
  });

  it('returns non-strings and empty text unchanged', () => {
    expect(redactCodeContent('')).toBe('');
    expect(redactCodeContent(undefined)).toBeUndefined();
  });
});

describe('createCodeRedactor', () => {
  const script = [
    'const apiKey = \'hunter2hunter2\';',
    `const other = '${OPENAI_KEY}';`,
    'const apiKeyCopy = \'hunter2hunter2\';',
    'const page = 2;'
  ].join('\n');

  it('hides each value behind a numbered placeholder and gives the same value the same number', () => {
    const redactor = createCodeRedactor();
    const out = redactor.redact(script);

    expect(out).not.toContain('hunter2hunter2');
    expect(out).not.toContain(OPENAI_KEY);
    const placeholder = out.match(/const apiKey = '(<redacted:\d+>)';/)[1];
    expect(out).toContain(`const apiKeyCopy = '${placeholder}';`);
    expect(out).toMatch(/const other = '<redacted:\d+>';/);
    expect(redactor.hiddenCount()).toBe(2);
  });

  it('puts the original values back into a file the model rewrote, so Apply cannot erase them', () => {
    const redactor = createCodeRedactor();
    const seenByModel = redactor.redact(script);

    const writtenByModel = `${seenByModel}\nconsole.log(apiKey.length);`;

    expect(redactor.restore(writtenByModel)).toBe(`${script}\nconsole.log(apiKey.length);`);
  });

  it('numbers values consistently across several pieces of one request', () => {
    const redactor = createCodeRedactor();
    const first = redactor.redact('const apiKey = \'hunter2hunter2\';');
    const second = redactor.redact('const token2 = \'other-value-here\';\nconst apiKey2 = \'hunter2hunter2\';');

    expect(first).toBe('const apiKey = \'<redacted:1>\';');
    expect(second).toContain('const token2 = \'<redacted:2>\';');
    expect(second).toContain('const apiKey2 = \'<redacted:1>\';');
  });

  it('does not hide a repeated value that sits under an ordinary name, which only the preview can show', () => {
    const redactor = createCodeRedactor();
    redactor.redact('const apiKey = \'hunter2hunter2\';');

    expect(redactor.redact('const copy = \'hunter2hunter2\';')).toBe('const copy = \'hunter2hunter2\';');
  });

  it('leaves a placeholder it did not issue untouched', () => {
    const redactor = createCodeRedactor();
    redactor.redact('const apiKey = \'hunter2hunter2\';');

    expect(redactor.restore('const x = \'<redacted:9>\';')).toBe('const x = \'<redacted:9>\';');
  });

  it('does nothing when body redaction is turned off', () => {
    const redactor = createCodeRedactor({ redactBody: false });

    expect(redactor.redact(script)).toBe(script);
    expect(redactor.restore(script)).toBe(script);
    expect(redactor.hiddenCount()).toBe(0);
  });

  it('keeps independent requests independent', () => {
    const first = createCodeRedactor();
    const second = createCodeRedactor();
    first.redact('const apiKey = \'aaaa-aaaa\';');
    second.redact('const apiKey = \'bbbb-bbbb\';');

    expect(first.restore('<redacted:1>')).toBe('aaaa-aaaa');
    expect(second.restore('<redacted:1>')).toBe('bbbb-bbbb');
  });

  it('passes non-strings through', () => {
    const redactor = createCodeRedactor();

    expect(redactor.redact(undefined)).toBeUndefined();
    expect(redactor.restore(null)).toBeNull();
  });
});
