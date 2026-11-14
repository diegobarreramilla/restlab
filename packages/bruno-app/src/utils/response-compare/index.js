import { diffLines } from 'diff';

/**
 * Compares two answers to the same request: status, headers and body. Works on what the Timeline already keeps
 * of each send, so nothing is sent again.
 */

const MAX_COMPARED_LINES = 20000;
const CONTEXT_LINES = 3;
// Hiding fewer lines than this saves nothing: the note that replaces them takes a line too.
const SMALLEST_GAP = 4;

// These change on every send and say nothing about the answer.
const HEADERS_THAT_ALWAYS_CHANGE = ['date', 'age'];

const BINARY_CONTENT_TYPE = /^(image|audio|video|font)\/|application\/(octet-stream|pdf|zip|gzip|x-tar|x-7z-compressed|vnd\.)/i;

const headerEntries = (headers) => {
  if (!headers || typeof headers !== 'object') return [];
  const entries = Array.isArray(headers) ? headers.map((h) => (Array.isArray(h) ? h : [h?.name, h?.value])) : Object.entries(headers);
  return entries
    .filter(([name]) => typeof name === 'string' && name)
    .map(([name, value]) => [name.toLowerCase(), Array.isArray(value) ? value.join(', ') : String(value ?? '')]);
};

const compareHeaders = (before, after) => {
  const old = new Map(headerEntries(before));
  const current = new Map(headerEntries(after));
  const names = [...new Set([...old.keys(), ...current.keys()])].filter((name) => !HEADERS_THAT_ALWAYS_CHANGE.includes(name)).sort();

  return names.flatMap((name) => {
    if (!old.has(name)) return [{ name, change: 'added', after: current.get(name) }];
    if (!current.has(name)) return [{ name, change: 'removed', before: old.get(name) }];
    if (old.get(name) !== current.get(name)) return [{ name, change: 'changed', before: old.get(name), after: current.get(name) }];
    return [];
  });
};

const contentTypeOf = (response) => headerEntries(response?.headers).find(([name]) => name === 'content-type')?.[1] || '';

/** The body as the text to compare: JSON is laid out one value per line, so a changed field is a changed line. */
export const responseBodyText = (response) => {
  const data = response?.data;
  if (data === undefined || data === null) return '';
  if (typeof data !== 'string') {
    return JSON.stringify(data, null, 2);
  }
  const trimmed = data.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch (error) {
      return data;
    }
  }
  return data;
};

const toLines = (text) => text.replace(/\n$/, '').split('\n');

// Keeps every changed line with a few unchanged ones around it; the rest becomes a gap that says how many lines it hides.
const collapseUnchanged = (lines) => {
  const keep = new Array(lines.length).fill(false);
  lines.forEach((line, index) => {
    if (line.kind === 'same') return;
    for (let i = Math.max(0, index - CONTEXT_LINES); i <= Math.min(lines.length - 1, index + CONTEXT_LINES); i++) keep[i] = true;
  });

  const rows = [];
  let index = 0;
  while (index < lines.length) {
    if (keep[index]) {
      rows.push(lines[index]);
      index += 1;
      continue;
    }
    const start = index;
    while (index < lines.length && !keep[index]) index += 1;
    if (index - start < SMALLEST_GAP) {
      rows.push(...lines.slice(start, index));
    } else {
      rows.push({ kind: 'gap', count: index - start });
    }
  }
  return rows;
};

const compareBodies = (before, after) => {
  if (BINARY_CONTENT_TYPE.test(contentTypeOf(before)) || BINARY_CONTENT_TYPE.test(contentTypeOf(after))) {
    return { comparable: false, reason: 'binary', identical: before?.dataBuffer === after?.dataBuffer };
  }

  const oldText = responseBodyText(before);
  const newText = responseBodyText(after);
  if (oldText === newText) {
    return { comparable: true, identical: true, added: 0, removed: 0, rows: [] };
  }
  if (toLines(oldText).length + toLines(newText).length > MAX_COMPARED_LINES) {
    return { comparable: false, reason: 'too-large', identical: false };
  }

  let added = 0;
  let removed = 0;
  const lines = diffLines(oldText, newText).flatMap((part) => {
    const kind = part.added ? 'added' : part.removed ? 'removed' : 'same';
    const partLines = toLines(part.value);
    if (part.added) added += partLines.length;
    if (part.removed) removed += partLines.length;
    return partLines.map((text) => ({ kind, text }));
  });

  return { comparable: true, identical: false, added, removed, rows: collapseUnchanged(lines) };
};

export const compareResponses = (before, after) => {
  const status = {
    before: before?.status,
    after: after?.status,
    changed: before?.status !== after?.status
  };
  const headers = compareHeaders(before?.headers, after?.headers);
  const body = compareBodies(before, after);

  return { status, headers, body, identical: !status.changed && headers.length === 0 && body.identical };
};

/** The sends of one request that got an answer, newest first. */
export const listComparableSends = (timeline, itemUid) =>
  (timeline || [])
    .filter((entry) => entry.type === 'request' && entry.itemUid === itemUid && entry.data?.response && !entry.data.response.error
      && typeof entry.data.response.status === 'number')
    .map((entry) => ({ timestamp: entry.timestamp, requestUid: entry.requestUid, response: entry.data.response }))
    .sort((a, b) => b.timestamp - a.timestamp);
