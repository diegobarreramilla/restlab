import { suggestSecretVariableName, uniqueVariableName, splitSchemePrefix, readSourceValue, writeSourceValue } from './index';

describe('suggestSecretVariableName', () => {
  it.each([
    [{ section: 'headers', name: 'X-Api-Key' }, 'xApiKey'],
    [{ section: 'headers', name: 'Authorization' }, 'authorizationToken'],
    [{ section: 'headers', name: 'Proxy-Authorization' }, 'proxyAuthorizationToken'],
    [{ section: 'params', name: 'api_key' }, 'apiKey'],
    [{ section: 'auth', name: 'bearer.token' }, 'bearerToken'],
    [{ section: 'auth', name: 'oauth2.clientSecret' }, 'oauth2ClientSecret'],
    [{ section: 'params', name: '1st' }, '_1st']
  ])('names %p %s', (source, expected) => {
    expect(suggestSecretVariableName(source)).toBe(expected);
  });
});

describe('uniqueVariableName', () => {
  it('keeps a free name and numbers a taken one', () => {
    expect(uniqueVariableName('apiKey', [{ name: 'host' }])).toBe('apiKey');
    expect(uniqueVariableName('apiKey', [{ name: 'apiKey' }, { name: 'apiKey2' }])).toBe('apiKey3');
  });
});

describe('splitSchemePrefix', () => {
  it('separates the scheme from the secret', () => {
    expect(splitSchemePrefix('Bearer abc123')).toEqual({ prefix: 'Bearer ', secret: 'abc123' });
    expect(splitSchemePrefix('abc123')).toEqual({ prefix: '', secret: 'abc123' });
  });
});

describe('readSourceValue and writeSourceValue', () => {
  const build = () => ({
    headers: [{ name: 'X-Key', value: 'k1', enabled: true }, { name: 'Off', value: 'k2', enabled: false }],
    params: [{ name: 'token', value: 'p1', enabled: true }],
    auth: { mode: 'bearer', bearer: { token: 'b1' } }
  });

  it('reads headers, parameters and auth fields', () => {
    const request = build();

    expect(readSourceValue(request, { section: 'headers', name: 'X-Key' })).toBe('k1');
    expect(readSourceValue(request, { section: 'params', name: 'token' })).toBe('p1');
    expect(readSourceValue(request, { section: 'auth', name: 'bearer.token' })).toBe('b1');
  });

  it('does not see a disabled header or a field that is gone', () => {
    const request = build();

    expect(readSourceValue(request, { section: 'headers', name: 'Off' })).toBeNull();
    expect(readSourceValue(request, { section: 'auth', name: 'basic.password' })).toBeNull();
  });

  it('writes in place and reports a missing field', () => {
    const request = build();

    expect(writeSourceValue(request, { section: 'headers', name: 'X-Key' }, '{{xKey}}')).toBe(true);
    expect(writeSourceValue(request, { section: 'auth', name: 'bearer.token' }, '{{bearerToken}}')).toBe(true);
    expect(writeSourceValue(request, { section: 'auth', name: 'basic.password' }, '{{x}}')).toBe(false);
    expect(request.headers[0].value).toBe('{{xKey}}');
    expect(request.auth.bearer.token).toBe('{{bearerToken}}');
  });
});
