const http = require('http');
const net = require('net');

jest.mock('electron', () => ({
  shell: { openExternal: jest.fn() }
}));

const { shell } = require('electron');
const { authorizeUserInSystemBrowser } = require('./authorize-user-in-system-browser');

const getFreePort = () => new Promise((resolve) => {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1', () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});

const get = (url) => new Promise((resolve, reject) => {
  http.get(url, { agent: false }, (res) => {
    res.resume();
    res.on('end', () => resolve(res.statusCode));
  }).on('error', reject);
});

// Plays the part of the browser: follows the authorization URL straight back to its redirect_uri.
const simulateBrowser = (responseParams) => {
  shell.openExternal.mockImplementation(async (authorizeUrl) => {
    const redirectUri = new URL(authorizeUrl).searchParams.get('redirect_uri');
    const callback = new URL(redirectUri);
    Object.entries(responseParams).forEach(([name, value]) => callback.searchParams.set(name, value));
    await get(callback.toString());
  });
};

describe('authorizeUserInSystemBrowser with a loopback callback URL', () => {
  let callbackUrl;
  let authorizeUrl;

  beforeEach(async () => {
    jest.clearAllMocks();
    const port = await getFreePort();
    callbackUrl = `http://127.0.0.1:${port}/oauth2/callback`;
    authorizeUrl = 'https://auth.example.com/authorize?response_type=code&client_id=abc';
  });

  it('resolves with the authorization code when the state matches', async () => {
    simulateBrowser({ code: 'the-code', state: 'good-state' });

    const result = await authorizeUserInSystemBrowser({ authorizeUrl, callbackUrl, expectedState: 'good-state' });

    expect(result.authorizationCode).toBe('the-code');
    expect(new URL(shell.openExternal.mock.calls[0][0]).searchParams.get('redirect_uri')).toBe(callbackUrl);
  });

  it('rejects a response whose state does not match', async () => {
    simulateBrowser({ code: 'the-code', state: 'forged-state' });

    await expect(authorizeUserInSystemBrowser({ authorizeUrl, callbackUrl, expectedState: 'good-state' }))
      .rejects.toThrow('state mismatch');
  });

  it('rejects when the provider returns an error', async () => {
    simulateBrowser({ error: 'access_denied', state: 'good-state' });

    await expect(authorizeUserInSystemBrowser({ authorizeUrl, callbackUrl, expectedState: 'good-state' }))
      .rejects.toThrow('Authorization Failed');
  });

  it('closes the local server once the flow ends', async () => {
    simulateBrowser({ code: 'the-code', state: 'good-state' });
    await authorizeUserInSystemBrowser({ authorizeUrl, callbackUrl, expectedState: 'good-state' });

    await expect(get(`${callbackUrl}?code=late&state=good-state`)).rejects.toThrow();
  });

  it('does not open a local server for a non-loopback callback URL', async () => {
    shell.openExternal.mockResolvedValue();
    const pending = authorizeUserInSystemBrowser({
      authorizeUrl,
      callbackUrl: 'https://example.com/callback',
      expectedState: 'good-state'
    });

    await new Promise((resolve) => setImmediate(resolve));
    expect(shell.openExternal).toHaveBeenCalledTimes(1);

    // Cancel the pending request so the test does not leave a 5 minute timer running.
    const { cancelOAuth2AuthorizationRequest } = require('../../utils/oauth2-protocol-handler');
    cancelOAuth2AuthorizationRequest();
    await expect(pending).rejects.toThrow('cancelled');
  });
});
