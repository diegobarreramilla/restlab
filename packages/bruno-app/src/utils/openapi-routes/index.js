import { openApiToBruno } from '@usebruno/converters';

/**
 * Turns an OpenAPI or Swagger description into the routes the URL bar can suggest, and works out which of
 * them fit what the user has typed. Each route carries the request the importer would create for it, so
 * choosing one can fill in the method, the path parameters and the body, not only the path.
 */

const MAX_SUGGESTIONS = 30;
const BASE_URL_VARIABLE = '{{baseUrl}}';

const flattenRequests = (items, out = []) => {
  for (const item of items || []) {
    if (item.type === 'folder') flattenRequests(item.items, out);
    else if (item.type === 'http-request' && item.request?.url) out.push(item);
  }
  return out;
};

/** The routes of one description. Returns an empty list for anything the importer cannot read. */
export const buildRoutes = (spec, source = '') => {
  const isDescription = spec && typeof spec === 'object' && (spec.openapi || spec.swagger) && spec.paths && typeof spec.paths === 'object';
  if (!isDescription) return [];

  let collection;
  try {
    collection = openApiToBruno(spec);
  } catch (error) {
    return [];
  }

  const baseUrl = collection.environments?.[0]?.variables?.find((variable) => variable.name === 'baseUrl')?.value || '';

  return flattenRequests(collection.items).map((item) => {
    const { request } = item;
    const path = request.url.startsWith(BASE_URL_VARIABLE) ? request.url.slice(BASE_URL_VARIABLE.length) : request.url;
    return {
      method: String(request.method || 'GET').toUpperCase(),
      path: path.startsWith('/') ? path : `/${path}`,
      name: item.name || '',
      baseUrl,
      source,
      request
    };
  });
};

/**
 * Splits what is typed in the URL bar into the part that says where the server is and the path after it:
 * `https://api.test/v1/us` -> base `https://api.test`, path `/v1/us`; `{{host}}/us` -> base `{{host}}`.
 * `path` is null while no path has been started, which is when nothing should be suggested.
 */
export const splitTypedUrl = (text) => {
  const typed = String(text || '');
  const withoutQuery = typed.split(/[?#]/)[0];
  const match = withoutQuery.match(/^((?:[a-z][a-z0-9+.-]*:\/\/)?[^/]*)(\/.*)?$/i);
  if (!match || match[2] === undefined) {
    return { base: withoutQuery, path: null };
  }
  return { base: match[1], path: match[2] };
};

const segmentsOf = (path) => path.split('/').filter(Boolean);
const isParameter = (segment) => segment.startsWith(':');

// A route fits when every typed segment equals the route's segment, a parameter segment standing for any
// value, and the last typed segment only needs to be the start of the route's.
const matchFromStart = (routeSegments, typedSegments, endsWithSlash) => {
  if (typedSegments.length > routeSegments.length) return false;
  // A trailing slash asks for something deeper than what is typed.
  if (endsWithSlash && typedSegments.length === routeSegments.length) return false;
  return typedSegments.every((typed, index) => {
    const segment = routeSegments[index];
    if (isParameter(segment)) return true;
    const isLastTyped = index === typedSegments.length - 1 && !endsWithSlash;
    return isLastTyped ? segment.toLowerCase().startsWith(typed.toLowerCase()) : segment.toLowerCase() === typed.toLowerCase();
  });
};

// The base path of a server (`/v1` in `https://api.test/v1`) may be typed before the route or left out.
const basePathOf = (baseUrl) => {
  const match = String(baseUrl).match(/^(?:[a-z][a-z0-9+.-]*:\/\/[^/]*)?(\/.*)?$/i);
  return match?.[1] ? segmentsOf(match[1]) : [];
};

/** The routes that fit the typed URL, best first. Nothing is suggested until a path has been started. */
export const matchRoutes = (routes, typedUrl, { method } = {}) => {
  const { path } = splitTypedUrl(typedUrl);
  if (path === null) return [];

  const typedSegments = segmentsOf(path);
  const endsWithSlash = path.endsWith('/');
  const lastTyped = endsWithSlash ? '' : (typedSegments[typedSegments.length - 1] || '').toLowerCase();

  const scored = [];
  for (const route of routes) {
    const routeSegments = segmentsOf(route.path);
    const prefix = basePathOf(route.baseUrl);
    const typedAfterPrefix = prefix.length && prefix.every((segment, index) => typedSegments[index]?.toLowerCase() === segment.toLowerCase())
      ? typedSegments.slice(prefix.length)
      : null;

    let score = null;
    if (matchFromStart(routeSegments, typedSegments, endsWithSlash) || (typedAfterPrefix && matchFromStart(routeSegments, typedAfterPrefix, endsWithSlash))) {
      score = 0;
    } else if (typedSegments.length === 1 && lastTyped && route.path.toLowerCase().includes(lastTyped)) {
      score = 1;
    }
    if (score === null) continue;
    // A route already written out in full has nothing left to complete.
    if (route.path === path && route.method === method) continue;
    scored.push({ route, score: score * 10 + (route.method === method ? 0 : 1) });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.route.path.length - b.route.path.length || a.route.path.localeCompare(b.route.path))
    .slice(0, MAX_SUGGESTIONS)
    .map(({ route }) => route);
};

const requiredQuery = (request) =>
  (request.params || []).filter((param) => param.type === 'query' && param.enabled).map((param) => `${param.name}=${param.value ?? ''}`);

const hasBody = (request) => Boolean(request?.body?.mode) && request.body.mode !== 'none';

/**
 * What choosing a route changes in the request being edited. The server part the user typed is kept; when
 * none was typed the one in the description is used. The body is only offered to a request that has none,
 * so nothing the user wrote is replaced.
 */
export const requestChangesFor = (route, { typedUrl, currentRequest }) => {
  const { base } = splitTypedUrl(typedUrl);
  const prefix = basePathOf(route.baseUrl);
  const typedSegments = segmentsOf(splitTypedUrl(typedUrl).path || '');
  const typedHasPrefix = prefix.length > 0 && prefix.every((segment, index) => typedSegments[index]?.toLowerCase() === segment.toLowerCase());

  let server = base;
  if (!server) server = route.baseUrl.replace(/\/$/, '');
  else if (typedHasPrefix) server = `${base}/${prefix.join('/')}`;

  const query = requiredQuery(route.request);
  const changes = {
    url: `${server}${route.path}${query.length ? `?${query.join('&')}` : ''}`,
    method: route.method
  };
  if (hasBody(route.request) && !hasBody(currentRequest)) {
    changes.body = route.request.body;
  }
  return changes;
};
