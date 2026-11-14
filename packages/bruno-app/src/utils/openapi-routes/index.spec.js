// The app's Jest setup replaces nanoid with a stub that lacks customAlphabet, which the importer uses for ids.
jest.mock('nanoid', () => {
  let counter = 0;
  const next = () => String(counter++).padStart(21, '0');
  return { nanoid: next, customAlphabet: () => next };
});

import { buildRoutes, matchRoutes, requestChangesFor, splitTypedUrl } from './index';

const spec = {
  openapi: '3.0.0',
  info: { title: 'Pets', version: '1' },
  servers: [{ url: 'https://api.pets.test/v1' }],
  paths: {
    '/pets': {
      get: { summary: 'List pets', parameters: [{ name: 'limit', in: 'query', required: true, schema: { type: 'integer' } }, { name: 'tag', in: 'query', schema: { type: 'string' } }] },
      post: {
        summary: 'Create a pet',
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } } }
      }
    },
    '/pets/{petId}': {
      get: { summary: 'Get a pet', parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }] },
      delete: { summary: 'Delete a pet', parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }] }
    },
    '/pets/{petId}/toys': { get: { summary: 'List the toys of a pet' } },
    '/owners': { get: { summary: 'List owners' } }
  }
};

const routes = buildRoutes(spec, 'pets.yaml');
const labels = (list) => list.map((route) => `${route.method} ${route.path}`);

describe('buildRoutes', () => {
  it('lists every operation with its method, its path in the app syntax and its summary', () => {
    expect(labels(routes).sort()).toEqual([
      'DELETE /pets/:petId',
      'GET /owners',
      'GET /pets',
      'GET /pets/:petId',
      'GET /pets/:petId/toys',
      'POST /pets'
    ]);
    expect(routes.find((route) => route.method === 'POST').name).toBe('Create a pet');
    expect(routes[0]).toMatchObject({ baseUrl: 'https://api.pets.test/v1', source: 'pets.yaml' });
  });

  it('reads a Swagger 2 description', () => {
    const swagger = { swagger: '2.0', info: { title: 'Old', version: '1' }, host: 'old.test', basePath: '/api', schemes: ['https'], paths: { '/ping': { get: { summary: 'Ping' } } } };

    expect(labels(buildRoutes(swagger))).toEqual(['GET /ping']);
  });

  it('returns nothing for something that is not a description', () => {
    expect(buildRoutes(null)).toEqual([]);
    expect(buildRoutes('nope')).toEqual([]);
    expect(buildRoutes({ hello: 'world' })).toEqual([]);
  });
});

describe('splitTypedUrl', () => {
  it.each([
    ['https://api.test/v1/us', 'https://api.test', '/v1/us'],
    ['{{host}}/us', '{{host}}', '/us'],
    ['localhost:3000/', 'localhost:3000', '/'],
    ['/pets?limit=1', '', '/pets'],
    ['https://api.test', 'https://api.test', null],
    ['{{host}}', '{{host}}', null],
    ['', '', null]
  ])('%s', (typed, base, path) => {
    expect(splitTypedUrl(typed)).toEqual({ base, path });
  });
});

describe('matchRoutes', () => {
  it('suggests nothing until a path is started', () => {
    expect(matchRoutes(routes, 'https://api.pets.test')).toEqual([]);
    expect(matchRoutes(routes, '{{baseUrl}}')).toEqual([]);
  });

  it('suggests every route once the path starts', () => {
    expect(matchRoutes(routes, '{{baseUrl}}/')).toHaveLength(6);
  });

  it('narrows as the path is typed, whatever the case', () => {
    expect(labels(matchRoutes(routes, '{{baseUrl}}/PE', { method: 'GET' }))).toEqual([
      'GET /pets',
      'GET /pets/:petId',
      'GET /pets/:petId/toys',
      'POST /pets',
      'DELETE /pets/:petId'
    ]);
  });

  it('lets a real value stand where the route has a parameter', () => {
    expect(labels(matchRoutes(routes, 'http://localhost:3000/pets/42/', { method: 'GET' }))).toEqual(['GET /pets/:petId/toys']);
    expect(labels(matchRoutes(routes, 'http://localhost:3000/pets/42/to'))).toEqual(['GET /pets/:petId/toys']);
  });

  it('accepts the base path of the server typed before the route', () => {
    expect(labels(matchRoutes(routes, 'http://localhost:3000/v1/own'))).toEqual(['GET /owners']);
  });

  it('finds a word in the middle of a route when nothing starts with it', () => {
    expect(labels(matchRoutes(routes, '{{baseUrl}}/toys'))).toEqual(['GET /pets/:petId/toys']);
  });

  it('puts the routes of the selected method first and drops the one already written in full', () => {
    expect(labels(matchRoutes(routes, '{{baseUrl}}/pets', { method: 'POST' }))[0]).toBe('GET /pets');
    expect(labels(matchRoutes(routes, '{{baseUrl}}/pets', { method: 'POST' }))).not.toContain('POST /pets');
  });

  it('suggests nothing for a path the description does not have', () => {
    expect(matchRoutes(routes, '{{baseUrl}}/invoices/')).toEqual([]);
  });
});

describe('requestChangesFor', () => {
  const route = (label) => routes.find((candidate) => `${candidate.method} ${candidate.path}` === label);
  const empty = { body: { mode: 'none' } };

  it('keeps the server the user typed and completes the path and the method', () => {
    expect(requestChangesFor(route('DELETE /pets/:petId'), { typedUrl: '{{host}}/pe', currentRequest: empty })).toEqual({
      url: '{{host}}/pets/:petId',
      method: 'DELETE'
    });
  });

  it('uses the server of the description when none was typed', () => {
    expect(requestChangesFor(route('GET /owners'), { typedUrl: '/ow', currentRequest: empty }).url).toBe('https://api.pets.test/v1/owners');
  });

  it('keeps the base path the user typed', () => {
    expect(requestChangesFor(route('GET /owners'), { typedUrl: 'http://localhost:3000/v1/ow', currentRequest: empty }).url)
      .toBe('http://localhost:3000/v1/owners');
  });

  it('adds the required query parameters and leaves the optional ones out', () => {
    expect(requestChangesFor(route('GET /pets'), { typedUrl: '{{host}}/', currentRequest: empty }).url).toBe('{{host}}/pets?limit=');
  });

  it('offers the body of the description only to a request without one', () => {
    const withBody = requestChangesFor(route('POST /pets'), { typedUrl: '{{host}}/', currentRequest: empty });
    expect(withBody.body.mode).toBe('json');
    expect(JSON.parse(withBody.body.json)).toEqual({ name: '' });

    const keepsMine = requestChangesFor(route('POST /pets'), { typedUrl: '{{host}}/', currentRequest: { body: { mode: 'json', json: '{"mine":1}' } } });
    expect(keepsMine.body).toBeUndefined();
  });
});
