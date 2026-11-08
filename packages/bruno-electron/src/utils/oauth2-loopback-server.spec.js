const http = require('http');
const net = require('net');
const {
  DEFAULT_OAUTH2_CALLBACK_URL,
  parseLoopbackCallbackUrl,
  startOauth2LoopbackServer
} = require('./oauth2-loopback-server');

const getFreePort = () => new Promise((resolve) => {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1', () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});

const get = (url) => new Promise((resolve, reject) => {
  http.get(url, { agent: false }, (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => resolve({ status: res.statusCode, body }));
  }).on('error', reject);
});

describe('parseLoopbackCallbackUrl', () => {
  it('accepts an http 127.0.0.1 address with a port', () => {
    expect(parseLoopbackCallbackUrl('http://127.0.0.1:5000/cb')).toEqual({
      port: 5000,
      pathname: '/cb',
      origin: 'http://127.0.0.1:5000'
    });
  });

  it('rejects remote hosts, https, missing ports and invalid input', () => {
    expect(parseLoopbackCallbackUrl('https://example.com/callback')).toBeNull();
    expect(parseLoopbackCallbackUrl('https://127.0.0.1:5000/cb')).toBeNull();
    expect(parseLoopbackCallbackUrl('http://127.0.0.1/cb')).toBeNull();
    expect(parseLoopbackCallbackUrl('restlab://app/oauth2/callback')).toBeNull();
    expect(parseLoopbackCallbackUrl('not a url')).toBeNull();
  });

  it('treats the default callback URL as a loopback address', () => {
    expect(parseLoopbackCallbackUrl(DEFAULT_OAUTH2_CALLBACK_URL)).not.toBeNull();
  });
});

describe('startOauth2LoopbackServer', () => {
  let server;
  let port;
  let onCallback;

  beforeEach(async () => {
    port = await getFreePort();
    onCallback = jest.fn();
    server = await startOauth2LoopbackServer({
      callbackUrl: `http://127.0.0.1:${port}/oauth2/callback`,
      onCallback
    });
  });

  afterEach(() => {
    server.close();
  });

  it('forwards an authorization code response as a full URL', async () => {
    const res = await get(`http://127.0.0.1:${port}/oauth2/callback?code=abc&state=xyz`);

    expect(res.status).toBe(200);
    expect(onCallback).toHaveBeenCalledWith(`http://127.0.0.1:${port}/oauth2/callback?code=abc&state=xyz`);
  });

  it('forwards an error response', async () => {
    await get(`http://127.0.0.1:${port}/oauth2/callback?error=access_denied&state=xyz`);

    expect(onCallback).toHaveBeenCalledWith(`http://127.0.0.1:${port}/oauth2/callback?error=access_denied&state=xyz`);
  });

  it('serves a page that moves a URL fragment into a second request, without calling back yet', async () => {
    const res = await get(`http://127.0.0.1:${port}/oauth2/callback`);

    expect(res.body).toContain('location.hash');
    expect(onCallback).not.toHaveBeenCalled();
  });

  it('rebuilds the fragment URL so implicit-grant tokens can be read', async () => {
    await get(`http://127.0.0.1:${port}/oauth2/callback/fragment?access_token=tok&state=xyz`);

    expect(onCallback).toHaveBeenCalledWith(`http://127.0.0.1:${port}/oauth2/callback#access_token=tok&state=xyz`);
  });

  it('ignores an empty fragment request and unknown paths', async () => {
    const empty = await get(`http://127.0.0.1:${port}/oauth2/callback/fragment`);
    const other = await get(`http://127.0.0.1:${port}/other?code=abc`);

    expect(empty.status).toBe(404);
    expect(other.status).toBe(404);
    expect(onCallback).not.toHaveBeenCalled();
  });

  it('stops accepting connections after close', async () => {
    server.close();

    await expect(get(`http://127.0.0.1:${port}/oauth2/callback?code=abc&state=xyz`)).rejects.toThrow();
  });
});

describe('startOauth2LoopbackServer errors', () => {
  it('rejects a callback URL that is not a loopback address', async () => {
    await expect(startOauth2LoopbackServer({
      callbackUrl: 'https://example.com/callback',
      onCallback: jest.fn()
    })).rejects.toThrow('127.0.0.1');
  });

  it('explains how to recover when the port is already in use', async () => {
    const port = await getFreePort();
    const first = await startOauth2LoopbackServer({
      callbackUrl: `http://127.0.0.1:${port}/cb`,
      onCallback: jest.fn()
    });

    await expect(startOauth2LoopbackServer({
      callbackUrl: `http://127.0.0.1:${port}/cb`,
      onCallback: jest.fn()
    })).rejects.toThrow(`Port ${port} is already in use`);

    first.close();
  });
});
