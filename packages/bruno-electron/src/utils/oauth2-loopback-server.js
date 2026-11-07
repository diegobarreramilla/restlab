const http = require('http');

// Default redirect URI for OAuth2 flows. It points at this machine, so the authorization
// response never passes through a third-party host. The same value is shown as the
// placeholder in bruno-app (components/RequestPane/Auth/OAuth2); keep both in sync.
const DEFAULT_OAUTH2_CALLBACK_URL = 'http://127.0.0.1:47831/oauth2/callback';

const LOOPBACK_HOST = '127.0.0.1';

const CLOSE_TAB_PAGE = '<!doctype html><meta charset="utf-8"><title>RestLab</title>'
  + '<p>Authorization received. You can close this tab and return to RestLab.</p>';

// The implicit grant returns its tokens in the URL fragment, which browsers never send to a server.
// This page moves the fragment into the query string of a second request so the app can read it.
const FORWARD_FRAGMENT_PAGE = '<!doctype html><meta charset="utf-8"><title>RestLab</title>'
  + '<script>location.replace(location.pathname.replace(/\\/$/, "") + "/fragment?" + location.hash.slice(1));</script>';

const parseLoopbackCallbackUrl = (callbackUrl) => {
  try {
    const url = new URL(callbackUrl);
    if (url.protocol !== 'http:' || url.hostname !== LOOPBACK_HOST || !url.port) {
      return null;
    }
    return { port: Number(url.port), pathname: url.pathname, origin: url.origin };
  } catch (error) {
    return null;
  }
};

const hasAuthorizationResponse = (url) => {
  return ['code', 'error', 'state'].some((name) => url.searchParams.has(name));
};

const respond = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Connection': 'close' });
  res.end(body);
};

// Listens only on 127.0.0.1 and hands each authorization response to `onCallback` as a full URL.
const startOauth2LoopbackServer = ({ callbackUrl, onCallback }) => {
  return new Promise((resolve, reject) => {
    const target = parseLoopbackCallbackUrl(callbackUrl);
    if (!target) {
      reject(new Error('The callback URL must be an http://127.0.0.1:<port> address to use the local callback server'));
      return;
    }

    const fragmentPathname = `${target.pathname.replace(/\/$/, '')}/fragment`;

    const server = http.createServer((req, res) => {
      if (req.method !== 'GET') {
        respond(res, 405, 'Method not allowed');
        return;
      }

      const requestUrl = new URL(req.url, target.origin);

      if (requestUrl.pathname === target.pathname) {
        if (hasAuthorizationResponse(requestUrl)) {
          respond(res, 200, CLOSE_TAB_PAGE);
          onCallback(requestUrl.toString());
        } else {
          respond(res, 200, FORWARD_FRAGMENT_PAGE);
        }
        return;
      }

      if (requestUrl.pathname === fragmentPathname && requestUrl.search.length > 1) {
        respond(res, 200, CLOSE_TAB_PAGE);
        onCallback(`${target.origin}${target.pathname}#${requestUrl.search.slice(1)}`);
        return;
      }

      respond(res, 404, 'Not found');
    });

    server.once('error', (error) => {
      const message = error.code === 'EADDRINUSE'
        ? `Port ${target.port} is already in use. Set a different Callback URL (http://127.0.0.1:<free port>/oauth2/callback) and register it with your provider.`
        : error.message;
      reject(new Error(message));
    });

    server.listen(target.port, LOOPBACK_HOST, () => {
      resolve({
        close: () => {
          server.close();
          server.closeAllConnections();
        }
      });
    });
  });
};

module.exports = {
  DEFAULT_OAUTH2_CALLBACK_URL,
  parseLoopbackCallbackUrl,
  startOauth2LoopbackServer
};
