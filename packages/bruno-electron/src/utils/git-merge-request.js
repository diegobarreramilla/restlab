/**
 * Merging two versions of one request part by part, instead of keeping one version whole.
 *
 * A request is cut into the parts a person thinks in (URL, headers, body, scripts...). Only the parts that
 * differ between the two sides need a decision, and the common ancestor says who changed each one: a part only
 * one side touched has an obvious answer, a part both touched does not.
 */
const { get, set, cloneDeep, isEqual } = require('lodash');

const PARTS = [
  'name',
  'seq',
  'tags',
  'request.method',
  'request.url',
  'request.params',
  'request.headers',
  'request.auth',
  'request.body',
  'request.vars',
  'request.script',
  'request.assertions',
  'request.tests',
  'request.docs',
  'settings',
  'examples'
];

// The parser gives every entry a fresh random `uid`, so two parses of the same text differ only by them.
const withoutUids = (value) => {
  if (Array.isArray(value)) return value.map(withoutUids);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'uid').map(([key, inner]) => [key, withoutUids(inner)]));
  }
  // Empty and missing mean the same in a request file.
  return value === undefined || value === '' ? null : value;
};

const partOf = (item, key) => withoutUids(get(item, key));
const samePart = (left, right, key) => isEqual(partOf(left, key), partOf(right, key));

/**
 * The parts where `ours` and `theirs` differ, each with who changed it since `base`: `ours`, `theirs` or `both`.
 * Without a base (both sides added the file) every difference counts as changed by both.
 */
const listConflictParts = ({ base, ours, theirs }) =>
  PARTS.filter((key) => !samePart(ours, theirs, key)).map((key) => {
    if (!base) return { key, changedBy: 'both' };
    if (samePart(base, ours, key)) return { key, changedBy: 'theirs' };
    if (samePart(base, theirs, key)) return { key, changedBy: 'ours' };
    return { key, changedBy: 'both' };
  });

/**
 * `ours` with the chosen parts taken from `theirs`. `choices` maps each differing part to `ours` or `theirs`;
 * a part left undecided is an error, because guessing would silently drop one side's work.
 */
const mergeRequestParts = ({ base, ours, theirs }, choices) => {
  const merged = cloneDeep(ours);
  for (const { key } of listConflictParts({ base, ours, theirs })) {
    const choice = choices?.[key];
    if (choice !== 'ours' && choice !== 'theirs') {
      throw new Error(`Choose a side for every part that differs (missing: ${key})`);
    }
    if (choice === 'theirs') {
      set(merged, key, cloneDeep(get(theirs, key)));
    }
  }
  return merged;
};

module.exports = { listConflictParts, mergeRequestParts };
