import { test, expect } from '../../playwright';

const ENDPOINT = 'http://localhost:8081/api/large-payload';

test.describe('Large payload endpoint', () => {
  test('returns a valid JSON array of the requested size with ?type=json', async ({ request }) => {
    const size = 100_000;
    const response = await request.get(`${ENDPOINT}?size=${size}&type=json`);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');

    const body = await response.body();
    expect(body.length).toBe(size);

    const parsed = JSON.parse(body.toString());
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0]).toMatchObject({ id: 1, name: 'item-1' });
    expect(typeof parsed[0].payload).toBe('string');
  });

  test('keeps the default text/plain response', async ({ request }) => {
    const size = 10_000;
    const response = await request.get(`${ENDPOINT}?size=${size}`);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/plain');

    const body = await response.body();
    expect(body.length).toBe(size);
    expect(body.toString()).toBe('bruno large payload '.repeat(Math.ceil(size / 20)).slice(0, size));
  });
});
