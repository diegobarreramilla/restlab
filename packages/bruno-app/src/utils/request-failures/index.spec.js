import { explainRequestFailure } from './index';

const kindOf = (input) => explainRequestFailure(input)?.kind ?? null;

describe('explainRequestFailure: requests that got no answer', () => {
  it.each([
    ['connect ECONNREFUSED 127.0.0.1:3000', 'connection-refused'],
    ['connect ECONNREFUSED ::1:1; connect ECONNREFUSED 127.0.0.1:1', 'connection-refused'],
    ['getaddrinfo ENOTFOUND no-such-host.invalid', 'host-not-found'],
    ['getaddrinfo EAI_AGAIN api.example.com', 'dns-unavailable'],
    ['timeout of 500ms exceeded', 'timeout'],
    ['connect ETIMEDOUT 10.0.0.1:443', 'unreachable'],
    ['connect EHOSTUNREACH 10.0.0.1:443', 'unreachable'],
    ['write EPROTO 409AFD3E687F0000:error:0A00010B:SSL routines:tls_validate_record_header:wrong version number:ssl/record/methods/tlsany_meth.c:70:\n', 'https-to-plain-http'],
    ['write EPROTO 46093589890272:error:100000f7:SSL routines:OPENSSL_internal:WRONG_VERSION_NUMBER:../../third_party/boringssl/src/ssl/tls_record.cc:127:', 'https-to-plain-http'],
    ['Parse Error: Expected HTTP/, RTSP/ or ICE/', 'not-http'],
    ['socket hang up', 'connection-closed'],
    ['read ECONNRESET', 'connection-closed'],
    ['Maximum number of redirects exceeded', 'too-many-redirects'],
    ['Unsupported protocol ftp:', 'unsupported-protocol'],
    ['Invalid URL', 'invalid-url'],
    ['self-signed certificate; if the root CA is installed locally, try running Node.js with --use-system-ca', 'certificate-untrusted'],
    ['certificate has expired', 'certificate-validity'],
    ['Hostname/IP does not match certificate\'s altnames: Host: a.test. is not in the cert\'s altnames', 'certificate-hostname']
  ])('%s -> %s', (error, kind) => {
    expect(kindOf({ error })).toBe(kind);
  });

  it('names the port and host that refused, taking the last address tried', () => {
    const { text } = explainRequestFailure({ error: 'connect ECONNREFUSED ::1:8080; connect ECONNREFUSED 127.0.0.1:8080' });
    expect(text).toContain('port 8080 of 127.0.0.1');
    expect(text).toContain('your server is running');
  });

  it('does not suggest starting a server for a remote host', () => {
    const { text } = explainRequestFailure({ error: 'connect ECONNREFUSED 93.184.216.34:81' });
    expect(text).not.toContain('your server is running');
  });

  it('reports the timeout in seconds and points to Settings', () => {
    const explanation = explainRequestFailure({ error: 'timeout of 1000ms exceeded' });
    expect(explanation.text).toContain('within 1 second,');
    expect(explanation.action).toBe('settings');
  });

  it('blames the variables for an invalid URL only when some are unresolved', () => {
    expect(explainRequestFailure({ error: 'Invalid URL', hasUnresolvedVariables: true }).text).toContain('has no value');
    expect(explainRequestFailure({ error: 'Invalid URL' }).text).not.toContain('has no value');
  });

  it('opens Preferences for certificate errors', () => {
    expect(explainRequestFailure({ error: 'certificate has expired' }).action).toBe('preferences');
  });

  it.each([
    ['REQUEST_CANCELLED'],
    ['Error invoking remote method \'send-http-request\': something'],
    ['An error occurred while executing the request'],
    ['the upstream said: timeout of patience exceeded'],
    ['']
  ])('stays silent for %j', (error) => {
    expect(explainRequestFailure({ error })).toBeNull();
  });
});

describe('explainRequestFailure: answers with a failing status', () => {
  it('names the scheme and realm a 401 asks for', () => {
    const explanation = explainRequestFailure({ status: 401, headers: { 'WWW-Authenticate': 'Basic realm="staff area"' } });
    expect(explanation.kind).toBe('authentication-required');
    expect(explanation.text).toContain('Basic authentication for "staff area"');
    expect(explanation.action).toBe('auth');
  });

  it('says the token was rejected and why when the server tells', () => {
    const explanation = explainRequestFailure({
      status: 401,
      headers: { 'www-authenticate': 'Bearer error="invalid_token", error_description="The access token expired"' }
    });
    expect(explanation.kind).toBe('token-rejected');
    expect(explanation.text).toContain('"The access token expired"');
  });

  it('explains a 401 without a challenge header', () => {
    expect(kindOf({ status: 401, headers: {} })).toBe('authentication-required');
  });

  it('lists the methods a 405 accepts', () => {
    const { text } = explainRequestFailure({ status: 405, headers: { allow: 'GET, HEAD' }, method: 'POST' });
    expect(text).toBe('This address does not accept POST. It accepts: GET, HEAD.');
  });

  it('reads Retry-After as seconds or as a date', () => {
    expect(explainRequestFailure({ status: 429, headers: { 'retry-after': '30' } }).text).toContain('try again in 30 seconds');
    expect(explainRequestFailure({ status: 503, headers: { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' } }).text)
      .toContain('after Wed, 21 Oct 2026 07:28:00 GMT');
    expect(explainRequestFailure({ status: 429, headers: { 'retry-after': 'soon' } }).text).toContain('Wait before sending again');
  });

  it('explains a redirect that was not followed, only when it says where to', () => {
    const explanation = explainRequestFailure({ status: 302, headers: { location: 'https://example.com/login' } });
    expect(explanation.kind).toBe('redirect-not-followed');
    expect(explanation.text).toContain('https://example.com/login');
    expect(explainRequestFailure({ status: 302, headers: {} })).toBeNull();
  });

  it('reads headers given as a list of name and value', () => {
    const { text } = explainRequestFailure({ status: 405, headers: [{ name: 'Allow', value: 'GET' }], method: 'PUT' });
    expect(text).toContain('It accepts: GET.');
  });

  it('shortens long header values', () => {
    const { text } = explainRequestFailure({ status: 302, headers: { location: `https://example.com/${'a'.repeat(400)}` } });
    expect(text.length).toBeLessThan(320);
  });

  it.each([[403, 'forbidden'], [407, 'proxy-authentication-required'], [413, 'body-too-large'], [415, 'unsupported-media-type'], [502, 'bad-gateway'], [504, 'gateway-timeout']])(
    '%i -> %s',
    (status, kind) => {
      expect(kindOf({ status, headers: {} })).toBe(kind);
    }
  );

  it.each([[200], [201], [204], [304], [400], [404], [409], [422], [500]])('stays silent for %i', (status) => {
    expect(explainRequestFailure({ status, headers: {} })).toBeNull();
  });

  it('stays silent without an error or a status', () => {
    expect(explainRequestFailure({})).toBeNull();
    expect(explainRequestFailure()).toBeNull();
  });
});
