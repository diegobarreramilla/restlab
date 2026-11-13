/**
 * Finds values that look like credentials stored in plain text inside a collection, so the user can be told
 * before the collection is exported or committed. It runs on the collection already in memory and reports
 * WHERE a value is and WHAT it looks like - never the value itself.
 */

export type SecretFindingKind =
  | 'private-key'
  | 'jwt'
  | 'provider-token'
  | 'password-in-url'
  | 'unmarked-environment-secret'
  | 'plain-credential';

export type SecretFindingSeverity = 'high' | 'medium';

export interface SecretFinding {
  kind: SecretFindingKind;
  severity: SecretFindingSeverity;
  /** Where the value lives, from the outside in: `['Environment', 'dev']`, `['users', 'list']`, ... */
  path: string[];
  /** The field that holds it: a variable, header or parameter name, or an auth field such as `bearer.token`. */
  field: string;
}

type Loose = any;

// A value written as `{{variable}}` is a reference, which is what the user should be doing.
const isReference = (value: string) => /\{\{[^}]+\}\}/.test(value);

const PLACEHOLDER = /^(<[^>]*>|\[[^\]]*\]|\$\{[^}]*\}|x{3,}|\*{3,}|\.{3,}|changeme|change-me|your[-_ ]?.*|example.*|todo|tbd|none|null|undefined|test|secret|password|token)$/i;

const SENSITIVE_NAME = [
  /password/i,
  /passwd/i,
  /(^|[-_.])pwd($|[-_.])/i,
  /secret/i,
  /api[-_]?key/i,
  /(access|auth|refresh|id|bearer|session|csrf)[-_]?token/i,
  /(^|[-_.])token($|[-_.])/i,
  /private[-_]?key/i,
  /client[-_]?secret/i
];

const SENSITIVE_HEADER = [/^authorization$/i, /^proxy-authorization$/i, /^x-api-key$/i, /^x-auth-token$/i, /^x-access-token$/i];

// `access_token_url` or `token_type` mention a token but are not one.
const NOT_A_CREDENTIAL_SUFFIX = /(url|uri|endpoint|type|expiry|expires|ttl|prefix|placement|header|name)$/i;

const isSensitiveName = (name: string) => !NOT_A_CREDENTIAL_SUFFIX.test(name) && SENSITIVE_NAME.some((re) => re.test(name));

const VALUE_PATTERNS: { kind: SecretFindingKind; severity: SecretFindingSeverity; re: RegExp }[] = [
  { kind: 'private-key', severity: 'high', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { kind: 'jwt', severity: 'high', re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/ },
  {
    kind: 'provider-token',
    severity: 'high',
    re: /\b(AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|sk_(live|test)_[A-Za-z0-9]{16,}|sk-[A-Za-z0-9_-]{20,}|glpat-[A-Za-z0-9_-]{20,})\b/
  },
  // scheme://user:password@host, where the password is not a {{variable}}
  { kind: 'password-in-url', severity: 'high', re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@{}]+:(?!\{\{)[^\s/@{}]{3,}@/i }
];

const looksLikeLiteralSecret = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length >= 4 && !isReference(value) && !PLACEHOLDER.test(value.trim());

const textOf = (value: unknown): string | null => (typeof value === 'string' && value.length ? value : null);

/** What the value itself looks like, regardless of the field that holds it. */
const classifyValue = (value: string): { kind: SecretFindingKind; severity: SecretFindingSeverity } | null => {
  const match = VALUE_PATTERNS.find(({ re }) => re.test(value));
  return match ? { kind: match.kind, severity: match.severity } : null;
};

class Collector {
  readonly findings: SecretFinding[] = [];
  private readonly seen = new Set<string>();

  add(finding: SecretFinding) {
    const key = `${finding.kind}|${finding.path.join('/')}|${finding.field}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.findings.push(finding);
  }

  /** A value in a field that is not a credential by name: only its shape can give it away. */
  checkValue(path: string[], field: string, value: unknown) {
    const text = textOf(value);
    if (!text) return;
    const byShape = classifyValue(text);
    if (byShape) this.add({ ...byShape, path, field });
  }

  /** A value in a field that is a credential by name or by role: a literal there is a finding. */
  checkCredential(path: string[], field: string, value: unknown) {
    const text = textOf(value);
    if (!text) return;
    const byShape = classifyValue(text);
    if (byShape) {
      this.add({ ...byShape, path, field });
    } else if (looksLikeLiteralSecret(text)) {
      this.add({ kind: 'plain-credential', severity: 'medium', path, field });
    }
  }
}

const AUTH_CREDENTIAL_FIELDS: Record<string, string[]> = {
  bearer: ['token'],
  basic: ['password'],
  digest: ['password'],
  ntlm: ['password'],
  wsse: ['password'],
  awsv4: ['secretAccessKey', 'sessionToken'],
  oauth1: ['consumerSecret', 'accessTokenSecret', 'privateKey'],
  oauth2: ['clientSecret', 'password'],
  akamaiEdgegrid: ['clientSecret', 'accessToken']
};

const scanAuth = (collector: Collector, path: string[], auth: Loose) => {
  if (!auth || typeof auth !== 'object') return;
  for (const [mode, fields] of Object.entries(AUTH_CREDENTIAL_FIELDS)) {
    const section = auth[mode];
    if (!section) continue;
    for (const field of fields) {
      collector.checkCredential(path, `auth.${mode}.${field}`, section[field]);
    }
  }
  if (auth.apikey) {
    collector.checkCredential(path, 'auth.apikey.value', auth.apikey.value);
  }
};

const isEnabled = (entry: Loose) => entry && entry.enabled !== false;

const scanKeyValues = (collector: Collector, path: string[], list: Loose, kind: 'header' | 'param' | 'var') => {
  if (!Array.isArray(list)) return;
  for (const entry of list) {
    if (!isEnabled(entry) || !entry.name) continue;
    const name = String(entry.name);
    const sensitive = kind === 'header' ? SENSITIVE_HEADER.some((re) => re.test(name)) || isSensitiveName(name) : isSensitiveName(name);
    if (sensitive) {
      collector.checkCredential(path, name, entry.value);
    } else {
      collector.checkValue(path, name, entry.value);
    }
  }
};

const scanRequestLike = (collector: Collector, path: string[], request: Loose) => {
  if (!request) return;
  collector.checkValue(path, 'url', request.url);
  scanKeyValues(collector, path, request.headers, 'header');
  scanKeyValues(collector, path, request.params, 'param');
  scanKeyValues(collector, path, request.vars?.req, 'var');
  scanAuth(collector, path, request.auth);
  const body = request.body;
  if (body) {
    collector.checkValue(path, 'body', body.json);
    collector.checkValue(path, 'body', body.text);
    collector.checkValue(path, 'body', body.xml);
  }
};

const scanEnvironments = (collector: Collector, environments: Loose) => {
  if (!Array.isArray(environments)) return;
  for (const environment of environments) {
    const path = ['Environment', String(environment?.name ?? '')];
    for (const variable of environment?.variables ?? []) {
      if (!isEnabled(variable) || !variable.name || variable.secret) continue;
      const value = variable.value;
      if (typeof value !== 'string' || !value.length) continue;
      const byShape = classifyValue(value);
      if (byShape) {
        collector.add({ ...byShape, path, field: String(variable.name) });
      } else if (isSensitiveName(String(variable.name)) && looksLikeLiteralSecret(value)) {
        collector.add({ kind: 'unmarked-environment-secret', severity: 'medium', path, field: String(variable.name) });
      }
    }
  }
};

const scanItems = (collector: Collector, parentPath: string[], items: Loose) => {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    const path = [...parentPath, String(item?.name ?? '')];
    if (item?.type === 'folder') {
      scanRequestLike(collector, path, item.root?.request);
      scanItems(collector, path, item.items);
    } else {
      scanRequestLike(collector, path, item?.request);
    }
  }
};

/** Scans the saved content of a collection (environments, collection and folder settings, requests). */
export const findSecretsInCollection = (collection: Loose): SecretFinding[] => {
  const collector = new Collector();
  if (!collection) return collector.findings;
  scanEnvironments(collector, collection.environments);
  scanRequestLike(collector, ['Collection settings'], collection.root?.request);
  scanItems(collector, [], collection.items);
  return collector.findings;
};
