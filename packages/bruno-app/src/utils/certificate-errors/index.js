// Tells apart the TLS errors that come from the server's certificate. The network layer only hands the
// renderer the message text, so this matches on it. Node and OpenSSL have spelled the same failure in more
// than one way ("self signed certificate" became "self-signed certificate"), so every variant is listed.
const CERTIFICATE_ERROR_PATTERNS = [
  ['untrusted', /self[- ]signed certificate/i],
  ['untrusted', /unable to (verify the (first certificate|leaf signature)|get (local )?issuer certificate)/i],
  ['validity', /certificate has expired|certificate is not yet valid/i],
  ['hostname', /hostname\/ip does not match certificate|ERR_TLS_CERT_ALTNAME_INVALID/i]
];

export const getCertificateErrorKind = (message) => {
  if (typeof message !== 'string' || !message) {
    return null;
  }

  const match = CERTIFICATE_ERROR_PATTERNS.find(([, pattern]) => pattern.test(message));
  return match ? match[0] : null;
};
