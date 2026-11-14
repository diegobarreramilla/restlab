import { getCertificateErrorKind } from 'utils/certificate-errors';

/**
 * Says in plain words why a request failed and what to try, using only what the request already returned:
 * the error text of a request that got no answer, or the status and headers of one that did. Rules are local;
 * nothing is sent anywhere.
 *
 * A wrong explanation is worse than none, so every rule matches something specific and anything else returns
 * null. `action` names where the fix lives: 'preferences', or a tab of the request ('auth', 'settings').
 */

const MAX_QUOTED_LENGTH = 120;

const quote = (value) => {
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > MAX_QUOTED_LENGTH ? `${text.slice(0, MAX_QUOTED_LENGTH)}...` : text;
};

const isLocalHost = (host) => /^(localhost|127(\.\d+){3}|::1|\[::1\]|0\.0\.0\.0)$/i.test(host);

// "connect ECONNREFUSED ::1:3000; connect ECONNREFUSED 127.0.0.1:3000" -> { host: '127.0.0.1', port: '3000' }
const lastAddress = (message, code) => {
  const matches = [...message.matchAll(new RegExp(`${code} (\\S+?):(\\d+)(?=[;\\s]|$)`, 'g'))];
  const last = matches[matches.length - 1];
  return last ? { host: last[1], port: last[2] } : null;
};

const CERTIFICATE_EXPLANATIONS = {
  untrusted: 'This server\'s certificate is not signed by an authority RestLab trusts. If you trust the server, add its CA certificate under "Use Custom CA Certificate" in Preferences. Turning off "SSL/TLS Certificate Verification" there also works, but skips the check for every request.',
  validity: 'This server\'s certificate is expired or not valid yet. Check the date on this computer and the server\'s certificate. Turning off "SSL/TLS Certificate Verification" in Preferences skips the check for every request.',
  hostname: 'This server\'s certificate was issued for a different host name than the one in the URL. Use the host name on the certificate, or turn off "SSL/TLS Certificate Verification" in Preferences, which skips the check for every request.'
};

const explainError = (message, { hasUnresolvedVariables }) => {
  const certificateKind = getCertificateErrorKind(message);
  if (certificateKind) {
    return { kind: `certificate-${certificateKind}`, text: CERTIFICATE_EXPLANATIONS[certificateKind], action: 'preferences' };
  }

  if (/\bECONNREFUSED\b/.test(message)) {
    const address = lastAddress(message, 'ECONNREFUSED');
    const where = address ? `port ${address.port} of ${address.host}` : 'that address';
    const local = address && isLocalHost(address.host);
    return {
      kind: 'connection-refused',
      text: `Nothing is listening on ${where}. ${local ? 'Check that your server is running and that the port in the URL is the one it uses.' : 'Check the host and port in the URL, and that the server is up.'}`
    };
  }

  const notFound = message.match(/\bENOTFOUND\s+(\S+)/);
  if (notFound) {
    return {
      kind: 'host-not-found',
      text: `The name "${quote(notFound[1])}" does not lead to any server. Check the URL for typos${hasUnresolvedVariables ? ' and the variables it uses' : ''}; a name from a private network also needs that network or its VPN.`
    };
  }

  if (/\bEAI_AGAIN\b/.test(message)) {
    return {
      kind: 'dns-unavailable',
      text: 'The name in the URL could not be looked up because the name server did not answer. Check this computer\'s network connection and send again.'
    };
  }

  const timedOut = message.match(/^timeout of (\d+)ms exceeded/);
  if (timedOut) {
    const seconds = Number(timedOut[1]) / 1000;
    return {
      kind: 'timeout',
      text: `The server did not answer within ${seconds} ${seconds === 1 ? 'second' : 'seconds'}, the timeout of this request. If the server is just slow, raise the timeout in the request's Settings; if it never answers, check the host and port.`,
      action: 'settings'
    };
  }

  if (/\b(ETIMEDOUT|EHOSTUNREACH|ENETUNREACH)\b/.test(message)) {
    return {
      kind: 'unreachable',
      text: 'This computer could not reach the server. Check the network connection, and whether the server needs a VPN or is behind a firewall.'
    };
  }

  // OpenSSL (Node) writes "wrong version number"; BoringSSL (Electron) writes "WRONG_VERSION_NUMBER".
  if (/\bEPROTO\b/.test(message) && /wrong[ _]version[ _]number/i.test(message)) {
    return {
      kind: 'https-to-plain-http',
      text: 'The URL uses https:// but that port does not speak HTTPS. Try http://, or the port where the server serves HTTPS.'
    };
  }

  if (/^Parse Error:/.test(message)) {
    return {
      kind: 'not-http',
      text: 'The server answered with something that is not HTTP. The port in the URL probably belongs to another kind of service.'
    };
  }

  if (/\bECONNRESET\b|^socket hang up$/.test(message)) {
    return {
      kind: 'connection-closed',
      text: 'The server closed the connection without answering. It may have crashed while handling the request, or the port expects another protocol (for example https:// instead of http://).'
    };
  }

  if (/^Maximum number of redirects exceeded/.test(message)) {
    return {
      kind: 'too-many-redirects',
      text: 'The server kept redirecting until the limit of this request was reached, usually because two addresses redirect to each other. The Timeline shows each hop; the limit is in the request\'s Settings.',
      action: 'settings'
    };
  }

  const badProtocol = message.match(/^Unsupported protocol (\S+)/);
  if (badProtocol) {
    return {
      kind: 'unsupported-protocol',
      text: `The URL starts with "${quote(badProtocol[1])}", which an HTTP request cannot use. Start it with http:// or https://.`
    };
  }

  if (/^Invalid URL/.test(message)) {
    return {
      kind: 'invalid-url',
      text: hasUnresolvedVariables
        ? 'The URL is not valid once its variables are filled in, and at least one of them has no value. Select the environment that defines them, or define them.'
        : 'The URL is not valid. Check for a missing host, spaces, or a port that is not a number up to 65535.'
    };
  }

  return null;
};

const headerValue = (headers, name) => {
  if (!headers || typeof headers !== 'object') return null;
  const entries = Array.isArray(headers) ? headers.map((h) => (Array.isArray(h) ? h : [h?.name, h?.value])) : Object.entries(headers);
  const found = entries.find(([key]) => typeof key === 'string' && key.toLowerCase() === name);
  if (!found || found[1] === undefined || found[1] === null) return null;
  const value = Array.isArray(found[1]) ? found[1].join(', ') : String(found[1]);
  return value.trim() || null;
};

// "120" -> "in 120 seconds"; an HTTP date -> "after <that date>"
const describeRetryAfter = (value) => {
  if (!value) return null;
  if (/^\d+$/.test(value)) {
    const seconds = Number(value);
    return `in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  }
  return Number.isNaN(Date.parse(value)) ? null : `after ${quote(value)}`;
};

const explainUnauthorized = (headers) => {
  const challenge = headerValue(headers, 'www-authenticate');
  const scheme = challenge?.match(/^([A-Za-z][A-Za-z0-9-]*)/)?.[1];

  if (scheme && /^bearer$/i.test(scheme) && /error="?invalid_token/i.test(challenge)) {
    const description = challenge.match(/error_description="([^"]*)"/i)?.[1];
    return {
      kind: 'token-rejected',
      text: `The server rejected the token${description ? `: "${quote(description)}"` : ''}. It may have expired; get a new one and send again.`,
      action: 'auth'
    };
  }

  if (scheme) {
    const realm = challenge.match(/realm="([^"]*)"/i)?.[1];
    return {
      kind: 'authentication-required',
      text: `The server asks for ${scheme} authentication${realm ? ` for "${quote(realm)}"` : ''} and did not accept what this request sent. Check the Auth tab.`,
      action: 'auth'
    };
  }

  return {
    kind: 'authentication-required',
    text: 'The server did not accept the credentials of this request, or the request sent none. Check the Auth tab.',
    action: 'auth'
  };
};

const explainStatus = (status, headers, { method }) => {
  if ([301, 302, 303, 307, 308].includes(status)) {
    const location = headerValue(headers, 'location');
    if (!location) return null;
    return {
      kind: 'redirect-not-followed',
      text: `The server redirects to ${quote(location)}, and this request does not follow redirects. Turn on "Follow Redirects" in the request's Settings, or send to that address.`,
      action: 'settings'
    };
  }

  switch (status) {
    case 401:
      return explainUnauthorized(headers);
    case 403:
      return {
        kind: 'forbidden',
        text: 'The server understood the request but refuses it. Unlike a 401, new credentials alone may not help: the account or token needs permission for this action.'
      };
    case 405: {
      const allow = headerValue(headers, 'allow');
      return {
        kind: 'method-not-allowed',
        text: `This address does not accept ${method ? quote(method) : 'this method'}.${allow ? ` It accepts: ${quote(allow)}.` : ''}`
      };
    }
    case 407:
      return {
        kind: 'proxy-authentication-required',
        text: 'The proxy between RestLab and the server asks for credentials. Set them in the proxy settings in Preferences.',
        action: 'preferences'
      };
    case 413:
      return { kind: 'body-too-large', text: 'The server refuses the body of this request because it is larger than it allows.' };
    case 415: {
      const accepted = headerValue(headers, 'accept-post') || headerValue(headers, 'accept-patch') || headerValue(headers, 'accept');
      return {
        kind: 'unsupported-media-type',
        text: `The server does not accept the format of the body. Check the body type and the Content-Type header.${accepted ? ` It accepts: ${quote(accepted)}.` : ''}`
      };
    }
    case 429: {
      const retry = describeRetryAfter(headerValue(headers, 'retry-after'));
      return {
        kind: 'rate-limited',
        text: `The server is limiting how many requests it accepts from you.${retry ? ` It asks you to try again ${retry}.` : ' Wait before sending again.'}`
      };
    }
    case 502:
      return {
        kind: 'bad-gateway',
        text: 'A gateway or proxy in front of the server got no valid answer from it. The application behind it is probably down or restarting; the request itself may be fine.'
      };
    case 503: {
      const retry = describeRetryAfter(headerValue(headers, 'retry-after'));
      return {
        kind: 'service-unavailable',
        text: `The server says it cannot handle requests right now (overloaded or in maintenance).${retry ? ` It asks you to try again ${retry}.` : ''} The request itself may be fine.`
      };
    }
    case 504:
      return {
        kind: 'gateway-timeout',
        text: 'A gateway or proxy in front of the server waited for it and gave up. The application behind it is slow or not answering; the request itself may be fine.'
      };
    default:
      return null;
  }
};

export const explainRequestFailure = ({ error, status, headers, method, hasUnresolvedVariables = false } = {}) => {
  if (typeof error === 'string' && error) {
    return explainError(error, { hasUnresolvedVariables });
  }
  if (typeof status === 'number') {
    return explainStatus(status, headers, { method });
  }
  return null;
};

export const FAILURE_ACTION_LABELS = {
  preferences: 'Open Preferences',
  auth: 'Open Auth',
  settings: 'Open Settings'
};
