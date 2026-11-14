import { compareResponses, listComparableSends, responseBodyText } from './index';

const json = (status, body, headers = {}) => ({ status, data: body, headers: { 'content-type': 'application/json', ...headers } });

describe('compareResponses', () => {
  it('reports two equal answers as identical, ignoring headers that change on every send', () => {
    const before = json(200, { id: 1 }, { date: 'Mon, 01 Jan 2026 00:00:00 GMT', age: '1' });
    const after = json(200, { id: 1 }, { date: 'Mon, 01 Jan 2026 00:00:09 GMT', age: '10' });

    expect(compareResponses(before, after)).toMatchObject({ identical: true, headers: [], body: { identical: true } });
  });

  it('reports a status change', () => {
    const result = compareResponses(json(200, {}), json(500, {}));

    expect(result.status).toEqual({ before: 200, after: 500, changed: true });
    expect(result.identical).toBe(false);
  });

  it('lists headers added, removed and changed, whatever their case', () => {
    const before = json(200, {}, { 'X-Version': '1', 'ETag': 'a' });
    const after = json(200, {}, { 'x-version': '2', 'Cache-Control': 'no-store' });

    expect(compareResponses(before, after).headers).toEqual([
      { name: 'cache-control', change: 'added', after: 'no-store' },
      { name: 'etag', change: 'removed', before: 'a' },
      { name: 'x-version', change: 'changed', before: '1', after: '2' }
    ]);
  });

  it('shows a changed JSON field as one line removed and one added', () => {
    const { body } = compareResponses(json(200, { id: 1, name: 'Ada' }), json(200, { id: 1, name: 'Grace' }));

    expect(body).toMatchObject({ comparable: true, identical: false, added: 1, removed: 1 });
    expect(body.rows.filter((row) => row.kind !== 'same')).toEqual([
      { kind: 'removed', text: '  "name": "Ada"' },
      { kind: 'added', text: '  "name": "Grace"' }
    ]);
  });

  it('compares JSON that arrived as text the same way, whatever its spacing', () => {
    const before = { status: 200, data: '{"id":1,"name":"Ada"}', headers: {} };
    const after = { status: 200, data: '{ "id": 1,\n "name": "Ada" }', headers: {} };

    expect(compareResponses(before, after).body.identical).toBe(true);
  });

  it('hides long runs of unchanged lines behind a gap that counts them', () => {
    const list = (last) => Array.from({ length: 40 }, (_, i) => ({ n: i })).concat([{ n: last }]);
    const { rows } = compareResponses(json(200, list('a')), json(200, list('b'))).body;

    expect(rows[0]).toEqual({ kind: 'gap', count: expect.any(Number) });
    expect(rows[0].count).toBeGreaterThan(100);
    expect(rows.filter((row) => row.kind === 'same').length).toBeLessThanOrEqual(6);
  });

  it('shows a short run of unchanged lines instead of hiding it', () => {
    const { rows } = compareResponses(json(200, { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }), json(200, { a: 0, b: 2, c: 3, d: 4, e: 5, f: 6 })).body;

    expect(rows.some((row) => row.kind === 'gap')).toBe(false);
  });

  it('does not compare binary bodies line by line, only whether they are the same', () => {
    const png = (dataBuffer) => ({ status: 200, dataBuffer, data: '\u0000', headers: { 'Content-Type': 'image/png' } });

    expect(compareResponses(png('AAA'), png('AAA')).body).toEqual({ comparable: false, reason: 'binary', identical: true });
    expect(compareResponses(png('AAA'), png('BBB')).identical).toBe(false);
  });

  it('refuses bodies too long to compare instead of freezing', () => {
    const long = (mark) => ({ status: 200, data: `${'line\n'.repeat(15000)}${mark}`, headers: {} });

    expect(compareResponses(long('a'), long('b')).body).toEqual({ comparable: false, reason: 'too-large', identical: false });
  });

  it('treats a missing body as empty', () => {
    expect(responseBodyText({})).toBe('');
    expect(compareResponses({ status: 204 }, { status: 204 }).identical).toBe(true);
  });

  it('keeps text that only looks like JSON as it is', () => {
    expect(responseBodyText({ data: '{not json' })).toBe('{not json');
  });
});

describe('listComparableSends', () => {
  const entry = (timestamp, response, extra = {}) => ({ type: 'request', itemUid: 'req-1', requestUid: `run-${timestamp}`, timestamp, data: { response }, ...extra });

  it('keeps the answered sends of the request, newest first', () => {
    const timeline = [
      entry(1, { status: 200 }),
      entry(2, { error: 'socket hang up' }),
      entry(3, { status: 500 }),
      entry(4, { status: 200 }, { itemUid: 'other' }),
      entry(5, { status: 200 }, { type: 'oauth2' })
    ];

    expect(listComparableSends(timeline, 'req-1').map((send) => send.timestamp)).toEqual([3, 1]);
  });

  it('is empty without a timeline', () => {
    expect(listComparableSends(undefined, 'req-1')).toEqual([]);
  });
});
