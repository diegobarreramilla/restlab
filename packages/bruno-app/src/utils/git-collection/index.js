import { flattenItems } from 'utils/collections/index';
import { normalizePath } from 'utils/common/path';

const joinPath = (root, relativePath) => normalizePath(`${root.replace(/[\\/]+$/, '')}/${relativePath}`);

/**
 * What a changed file is to the user: the request it holds when it is one, and its path inside the collection.
 * Git reports paths relative to the repository, which may be larger than the collection.
 */
export const describeRepositoryFile = (collection, overview, repositoryPath) => {
  const absolutePath = joinPath(overview.gitRootPath, repositoryPath);
  const item = flattenItems(collection.items).find((candidate) => candidate.pathname && normalizePath(candidate.pathname) === absolutePath);
  const prefix = overview.collectionPrefix ? `${overview.collectionPrefix}/` : '';
  const pathInCollection = repositoryPath.startsWith(prefix) ? repositoryPath.slice(prefix.length) : repositoryPath;
  return { name: item?.name || pathInCollection.split('/').pop(), pathInCollection, item: item || null };
};

/** The path Git uses for a collection item, relative to the repository. */
export const repositoryPathOfItem = (overview, item) => {
  const root = normalizePath(overview.gitRootPath).replace(/\/+$/, '');
  const pathname = normalizePath(item.pathname);
  return pathname.startsWith(`${root}/`) ? pathname.slice(root.length + 1) : null;
};

const ENTRY_KINDS = { headers: 'Header', params: 'Parameter', vars: 'Variable', assertions: 'Assertion' };
const FIELD_NAMES = {
  url: 'URL',
  method: 'Method',
  body: 'Body',
  auth: 'Auth',
  name: 'Name',
  seq: 'Position',
  tags: 'Tags',
  docs: 'Docs',
  tests: 'Tests',
  script: 'Script',
  settings: 'Settings'
};
const METHOD_BLOCKS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace', 'connect', 'http', 'graphql', 'grpc', 'ws'];

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * A field label from the blame (`http.headers[Accept]`, `get.url`, `headers.Accept`) in words: "Header Accept", "URL".
 * Both file formats name the same thing differently, so both spellings map to one wording.
 */
export const describeBlameField = (field) => {
  const listEntry = /(?:^|\.)([A-Za-z:]+)\[(.+)\]$/.exec(field);
  if (listEntry) {
    const kind = ENTRY_KINDS[listEntry[1].split(':')[0]];
    return kind ? `${kind} ${listEntry[2]}` : `${capitalize(listEntry[1])} ${listEntry[2]}`;
  }

  const segments = field.split('.');
  const [block] = segments[0].split(':');
  if (segments.length > 1 && ENTRY_KINDS[block]) {
    return `${ENTRY_KINDS[block]} ${segments.slice(1).join('.')}`;
  }

  const meaningful = segments.filter((segment, index) => !(index === 0 && [...METHOD_BLOCKS, 'info', 'meta'].includes(segment)));
  const words = meaningful.map((segment) => FIELD_NAMES[segment.split(':')[0]] || capitalize(segment.replace(/[:_-]/g, ' ')));
  return words.join(' ') || capitalize(field);
};

/**
 * Drops the rows that only exist because of the file's structure (`http`, `http.headers`): a row is kept when
 * no other row sits inside it.
 */
export const leafBlameFields = (fields) =>
  fields.filter(({ field }) => !fields.some((other) => other.field !== field && (other.field.startsWith(`${field}.`) || other.field.startsWith(`${field}[`))));
