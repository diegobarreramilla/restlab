/**
 * Looks over a collection already in memory for things that will go wrong when a request is sent: a
 * `{{variable}}` nothing defines, one that some environments lack, a request without a URL, two requests with
 * the same name in one folder. It only reports what it can be sure of; a variable a script might set at run
 * time counts as defined.
 */

import { getInheritedEnvironments } from '../utils/environment-inheritance';

export type CollectionCheckKind
  = | 'undefined-variable'
    | 'variable-missing-in-environments'
    | 'empty-url'
    | 'duplicate-name';

export type CollectionCheckLocationType = 'environment' | 'collection' | 'folder' | 'request';

export interface CollectionCheckFinding {
  kind: CollectionCheckKind;
  location: { type: CollectionCheckLocationType; uid?: string };
  /** Where it is, from the outside in: `['users', 'list']`, `['Environments']`, ... */
  path: string[];
  /** The variable or the repeated name; absent for a request without a URL. */
  name?: string;
  /** For `variable-missing-in-environments`: the environments that lack it. */
  environments?: string[];
  /** For `duplicate-name`: how many siblings share the name. */
  count?: number;
}

export interface CollectionCheckOptions {
  /** Names defined outside the collection, such as global environment variables. */
  externalVariableNames?: string[];
}

type Loose = any;

const REQUEST_TYPES = ['http-request', 'graphql-request', 'grpc-request', 'ws-request'];

const isEnabled = (entry: Loose) => entry && entry.enabled !== false;

// `{{user.id}}` and `{{items[0]}}` read the variable `user` and `items`. Anything that is not a plain name
// (`$randomInt`, `?prompt`, `process.env.X`, an expression) is resolved elsewhere and left alone.
const variableNamesIn = (text: unknown): string[] => {
  if (typeof text !== 'string' || !text.includes('{{')) return [];
  const names: string[] = [];
  for (const match of text.matchAll(/\{\{([^{}]+)\}\}/g)) {
    const expression = match[1].trim();
    const root = expression.split(/[.[]/)[0];
    if (root === 'process' || !/^[A-Za-z_][\w-]*$/.test(root)) continue;
    names.push(root);
  }
  return names;
};

const stringsIn = (value: Loose, out: string[] = []): string[] => {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => stringsIn(entry, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((entry) => stringsIn(entry, out));
  return out;
};

const enabledValues = (list: Loose): string[] =>
  Array.isArray(list) ? list.filter(isEnabled).flatMap((entry: Loose) => [entry.name, entry.value]) : [];

/** Every piece of text in a request (or in folder and collection settings) where a variable can be written. */
const textsOfRequest = (request: Loose): string[] => {
  if (!request) return [];
  const body = request.body || {};
  return [
    request.url,
    ...enabledValues(request.headers),
    ...enabledValues(request.params),
    ...enabledValues(request.vars?.req),
    ...stringsIn(request.auth),
    body.json,
    body.text,
    body.xml,
    body.sparql,
    ...enabledValues(body.formUrlEncoded),
    ...enabledValues(body.multipartForm),
    ...stringsIn(body.graphql)
  ].filter((text) => typeof text === 'string');
};

const namesDefinedBy = (list: Loose): string[] =>
  Array.isArray(list) ? list.filter((entry: Loose) => isEnabled(entry) && entry.name).map((entry: Loose) => String(entry.name)) : [];

const SCRIPT_SETS_VARIABLE = /\bbru\s*\.\s*set(?:Env|GlobalEnv|Collection|Folder|Request)?Var\s*\(\s*['"`]([^'"`]+)['"`]/g;

const namesSetByScripts = (request: Loose): string[] => {
  if (!request) return [];
  const code = [request.script?.req, request.script?.res, request.tests].filter((text) => typeof text === 'string').join('\n');
  const names = [...code.matchAll(SCRIPT_SETS_VARIABLE)].map((match) => match[1]);
  // Post-response variables are assigned from the response, so later requests can read them.
  return [...names, ...namesDefinedBy(request.vars?.res)];
};

interface Walked {
  item: Loose;
  path: string[];
  /** Variables defined by the folders above the item. */
  folderVariables: string[];
}

const walk = (items: Loose, parentPath: string[], folderVariables: string[], visit: (walked: Walked) => void) => {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    const path = [...parentPath, String(item?.name ?? '')];
    visit({ item, path, folderVariables });
    if (item?.type === 'folder') {
      walk(item.items, path, [...folderVariables, ...namesDefinedBy(item.root?.request?.vars?.req)], visit);
    }
  }
};

const isLoaded = (item: Loose) => !item?.partial && !item?.loading && !item?.error;

const environmentVariableNames = (environments: Loose[]): Map<string, Set<string>> => {
  const byEnvironment = new Map<string, Set<string>>();
  for (const environment of environments) {
    const { inheritedEnvironments } = getInheritedEnvironments({ environments, environment });
    const names = [...inheritedEnvironments, environment].flatMap((env: Loose) => namesDefinedBy(env.variables));
    byEnvironment.set(String(environment.name), new Set(names));
  }
  return byEnvironment;
};

const findDuplicateNames = (siblings: Loose, parentPath: string[], findings: CollectionCheckFinding[]) => {
  if (!Array.isArray(siblings)) return;
  const groups = new Map<string, Loose[]>();
  for (const item of siblings.filter((sibling: Loose) => REQUEST_TYPES.includes(sibling?.type) && sibling.name)) {
    const key = String(item.name).trim().toLowerCase();
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    findings.push({
      kind: 'duplicate-name',
      location: { type: 'request', uid: group[0].uid },
      path: parentPath,
      name: String(group[0].name),
      count: group.length
    });
  }
  for (const folder of siblings.filter((sibling: Loose) => sibling?.type === 'folder')) {
    findDuplicateNames(folder.items, [...parentPath, String(folder.name ?? '')], findings);
  }
};

export const checkCollection = (collection: Loose, options: CollectionCheckOptions = {}): CollectionCheckFinding[] => {
  const findings: CollectionCheckFinding[] = [];
  if (!collection) return findings;

  const environments: Loose[] = Array.isArray(collection.environments) ? collection.environments : [];
  const namesByEnvironment = environmentVariableNames(environments);
  const inSomeEnvironment = new Set([...namesByEnvironment.values()].flatMap((names) => [...names]));

  const collectionRequest = collection.root?.request;
  const definedEverywhere = new Set<string>([
    ...(options.externalVariableNames || []),
    ...namesDefinedBy(collectionRequest?.vars?.req),
    ...namesSetByScripts(collectionRequest)
  ]);

  // A script anywhere may set a variable that a request elsewhere reads. When part of the collection is not
  // loaded its scripts are unknown, so nothing can be called undefined with certainty.
  let everythingLoaded = true;
  walk(collection.items, [], [], ({ item }) => {
    if (!isLoaded(item)) {
      everythingLoaded = false;
      return;
    }
    const request = item.type === 'folder' ? item.root?.request : item.request;
    namesSetByScripts(request).forEach((name) => definedEverywhere.add(name));
  });

  const usedFromEnvironments = new Set<string>();
  const checkVariables = (texts: string[], defined: Set<string>, where: Pick<CollectionCheckFinding, 'location' | 'path'>) => {
    const reported = new Set<string>();
    for (const name of texts.flatMap(variableNamesIn)) {
      if (defined.has(name) || definedEverywhere.has(name) || reported.has(name)) continue;
      if (inSomeEnvironment.has(name)) {
        usedFromEnvironments.add(name);
        continue;
      }
      if (!everythingLoaded) continue;
      reported.add(name);
      findings.push({ kind: 'undefined-variable', ...where, name });
    }
  };

  checkVariables(textsOfRequest(collectionRequest), new Set(), { location: { type: 'collection' }, path: ['Collection settings'] });

  walk(collection.items, [], [], ({ item, path, folderVariables }) => {
    if (!isLoaded(item)) return;

    if (item.type === 'folder') {
      const defined = new Set([...folderVariables, ...namesDefinedBy(item.root?.request?.vars?.req)]);
      checkVariables(textsOfRequest(item.root?.request), defined, { location: { type: 'folder', uid: item.uid }, path });
      return;
    }
    if (!REQUEST_TYPES.includes(item.type)) return;

    const where = { location: { type: 'request' as const, uid: item.uid }, path };
    if (typeof item.request?.url !== 'string' || !item.request.url.trim()) {
      findings.push({ kind: 'empty-url', ...where });
    }
    checkVariables(textsOfRequest(item.request), new Set([...folderVariables, ...namesDefinedBy(item.request?.vars?.req)]), where);
  });

  for (const name of usedFromEnvironments) {
    const missing = [...namesByEnvironment.entries()].filter(([, names]) => !names.has(name)).map(([environment]) => environment);
    if (missing.length) {
      findings.push({
        kind: 'variable-missing-in-environments',
        location: { type: 'environment' },
        path: ['Environments'],
        name,
        environments: missing
      });
    }
  }

  findDuplicateNames(collection.items, [], findings);

  return findings;
};
