import { getCertificateErrorKind } from './index';

describe('getCertificateErrorKind', () => {
  it.each([
    ['self-signed certificate; if the root CA is installed locally, try running Node.js with --use-system-ca'],
    ['self signed certificate'],
    ['self-signed certificate in chain'],
    ['unable to verify the first certificate'],
    ['unable to get local issuer certificate'],
    ['unable to get issuer certificate'],
    ['unable to verify the leaf signature'],
    ['Error invoking remote method \'send-http-request\': Error: SELF-SIGNED CERTIFICATE']
  ])('treats "%s" as an untrusted certificate', (message) => {
    expect(getCertificateErrorKind(message)).toBe('untrusted');
  });

  it.each([['certificate has expired'], ['certificate is not yet valid']])('treats "%s" as a validity problem', (message) => {
    expect(getCertificateErrorKind(message)).toBe('validity');
  });

  it('recognizes a host name that the certificate does not cover', () => {
    expect(getCertificateErrorKind('Hostname/IP does not match certificate\'s altnames: IP: 127.0.0.1 is not in the cert\'s list')).toBe('hostname');
  });

  it.each([[undefined], [null], [''], [42], ['connect ECONNREFUSED 127.0.0.1:8080'], ['timeout of 5000ms exceeded']])(
    'ignores %p',
    (message) => {
      expect(getCertificateErrorKind(message)).toBeNull();
    }
  );
});
