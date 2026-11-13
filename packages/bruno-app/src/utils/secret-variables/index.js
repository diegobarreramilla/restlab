import { get, set } from 'lodash';

const SCHEME_PREFIX = /^(bearer|basic|token|digest)\s+/i;

const camelCase = (text) =>
  text
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word, index) => (index === 0 ? word.charAt(0).toLowerCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');

/** A readable variable name for a value found at `source`: `X-Api-Key` -> `xApiKey`, `bearer.token` -> `bearerToken`. */
export const suggestSecretVariableName = (source) => {
  const base = camelCase(source.name) || 'secret';
  const named = source.section === 'headers' && /^(proxy-)?authorization$/i.test(source.name) ? `${base}Token` : base;
  return /^[0-9]/.test(named) ? `_${named}` : named;
};

/** A name not yet used in `variables`: `apiKey`, then `apiKey2`, `apiKey3`... */
export const uniqueVariableName = (name, variables) => {
  const taken = new Set((variables || []).map((variable) => variable.name));
  let candidate = name;
  for (let counter = 2; taken.has(candidate); counter++) {
    candidate = `${name}${counter}`;
  }
  return candidate;
};

/** `Bearer abc` -> `{ prefix: 'Bearer ', secret: 'abc' }`, so the scheme stays in the request and only the token moves. */
export const splitSchemePrefix = (value) => {
  const match = SCHEME_PREFIX.exec(value);
  return match ? { prefix: match[0], secret: value.slice(match[0].length) } : { prefix: '', secret: value };
};

const findEnabledEntry = (list, name) => (list || []).find((entry) => entry.enabled !== false && entry.name === name);

/** The value of the field `source` points at in a request, or null when it is not there any more. */
export const readSourceValue = (request, source) => {
  if (source.section === 'auth') {
    const value = get(request?.auth, source.name);
    return typeof value === 'string' && value.length ? value : null;
  }
  const entry = findEnabledEntry(request?.[source.section], source.name);
  return typeof entry?.value === 'string' && entry.value.length ? entry.value : null;
};

/** Writes `value` into the field `source` points at, in place. Returns false when the field is not there. */
export const writeSourceValue = (request, source, value) => {
  if (source.section === 'auth') {
    if (readSourceValue(request, source) === null) return false;
    set(request.auth, source.name, value);
    return true;
  }
  const entry = findEnabledEntry(request?.[source.section], source.name);
  if (!entry) return false;
  entry.value = value;
  return true;
};
