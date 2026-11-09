// Guard: nothing in RestLab may switch itself on. Every opt-in feature (AI, notifications,
// caches, autosave) must default to `false`, and any *new* `enabled`/`telemetry`/`analytics`
// flag that arrives as `true` has to be added to the allowlist below with a reason.
//
// A failure here is not a test to relax: it means a default changed and someone has to decide
// whether that is what we want to ship.
jest.mock('electron-store', () =>
  jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn()
  }))
);

const { defaultPreferences } = require('./preferences');

// Opt-in features that must stay off until the user turns them on.
// `ai.providers.*.enabled` is expanded over every configured provider, so adding a provider
// with `enabled: true` fails here too.
const MUST_DEFAULT_TO_FALSE = [
  'ai.enabled',
  'ai.autocomplete.enabled',
  'ai.providers.*.enabled',
  'general.fetchNotifications',
  'cache.sslSession.enabled',
  'cache.file.enabled'
];

// Flags that are legitimately `true` by default. Each entry needs a reason: this is not a
// "known failures" list, it is a decision that is safe for every user without asking.
const ALLOWED_TRUE = new Map([
  [
    'request.keepDefaultCaCertificates.enabled',
    'Security: trusting the OS certificate store is the safe default; turning it off would make TLS fail, not protect anyone.'
  ]
]);

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Resolves a dotted path. A `*` segment expands over every key of the object at that point,
 * so `ai.providers.*.enabled` covers providers added later.
 * Returns `[{ path, value }]`, or `[]` when the path does not exist.
 */
const resolvePath = (source, dottedPath) => {
  let matches = [{ path: '', value: source }];

  for (const segment of dottedPath.split('.')) {
    const next = [];
    for (const match of matches) {
      if (segment === '*') {
        if (!isPlainObject(match.value)) continue;
        for (const [key, value] of Object.entries(match.value)) {
          next.push({ path: match.path ? `${match.path}.${key}` : key, value });
        }
      } else if (isPlainObject(match.value) && Object.prototype.hasOwnProperty.call(match.value, segment)) {
        next.push({ path: match.path ? `${match.path}.${segment}` : segment, value: match.value[segment] });
      }
    }
    matches = next;
  }

  return matches;
};

/**
 * Walks the whole preferences tree and returns the paths of every `enabled`, `telemetry` or
 * `analytics` key whose value is literally `true`.
 */
const findEnabledByDefault = (value, path = []) => {
  if (value === null || typeof value !== 'object') return [];

  const found = [];
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...path, key];
    if ((key === 'enabled' || key === 'telemetry' || key === 'analytics') && child === true) {
      found.push(childPath.join('.'));
    }
    found.push(...findEnabledByDefault(child, childPath));
  }
  return found;
};

describe('default preferences keep opt-in features off', () => {
  it.each(MUST_DEFAULT_TO_FALSE)('%s is false by default', (dottedPath) => {
    const matches = resolvePath(defaultPreferences, dottedPath);

    // A renamed or removed path must fail loudly instead of silently protecting nothing.
    expect(matches.length).toBeGreaterThan(0);

    const enabled = matches.filter(({ value }) => value !== false);
    expect(enabled.map(({ path, value }) => `${path} is ${JSON.stringify(value)}`)).toEqual([]);
  });

  it('does not enable any new enabled/telemetry/analytics flag without an explicit decision', () => {
    const enabledByDefault = findEnabledByDefault(defaultPreferences);
    const unexpected = enabledByDefault.filter((path) => !ALLOWED_TRUE.has(path));

    expect(unexpected).toEqual([]);
  });

  it('keeps the allowlist honest: every allowed flag still exists and is true', () => {
    for (const path of ALLOWED_TRUE.keys()) {
      const matches = resolvePath(defaultPreferences, path);
      expect(matches.map(({ value }) => value)).toEqual([true]);
    }
  });
});
