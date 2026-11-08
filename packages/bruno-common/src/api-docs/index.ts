import isRequestTagsIncluded, { getEffectiveTags, getSavedFolderTags } from '../tags';

export interface TaggedItem {
  type?: string;
  tags?: string[];
  items?: TaggedItem[];
  [key: string]: unknown;
}

export interface NamedEnvironment {
  name?: string;
  [key: string]: unknown;
}

export interface DocsCollection {
  name?: string;
  items?: TaggedItem[];
  environments?: NamedEnvironment[];
  [key: string]: unknown;
}

export interface DocsOpenCollection {
  info?: { name?: string; version?: string; [key: string]: unknown };
  extensions?: { bruno?: Record<string, unknown>; [key: string]: unknown };
  [key: string]: unknown;
}

export interface ApiDocsMetadata {
  collectionVersion?: string | number | null;
  exportedAt?: string;
  exportedUsing?: string;
}

/** The viewer's script and stylesheet, embedded in the file so it opens with no network */
export interface ApiDocsInlineAssets {
  js: string;
  css: string;
}

export interface ApiDocsHtmlOptions {
  gitCollectionUrl?: string | null;
  /** Load the viewer from this server instead of embedding it. Used only when `inlineAssets` is absent */
  rendererBaseUrl?: string;
  inlineAssets?: ApiDocsInlineAssets;
}

export interface GenerateApiDocsOptions extends ApiDocsMetadata {
  tags?: { include?: string[]; exclude?: string[] };
  environments?: { include?: string[]; exclude?: string[] };
  gitCollectionUrl?: string | null;
  rendererBaseUrl?: string;
}

export interface ApiDocsDependencies {
  brunoToOpenCollection: (collection: DocsCollection) => DocsOpenCollection;
  dumpYaml: (value: DocsOpenCollection, options: object) => string;
  escapeString: (value: string, options: object) => string;
}

const YAML_DUMP_OPTIONS = { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false };
const JSESC_OPTIONS = { quotes: 'double', wrap: true };

const isFolder = (item: TaggedItem): boolean => item.type === 'folder' || Array.isArray(item.items);
const isRequestItem = (item: TaggedItem): boolean =>
  typeof item.type === 'string' && item.type.endsWith('-request');

export const filterRequestItemsByTags = <T extends TaggedItem>(
  items: T[],
  includeTags: string[] = [],
  excludeTags: string[] = [],
  inheritedTags: string[] = []
): T[] => {
  if (includeTags.length === 0 && excludeTags.length === 0) {
    return items;
  }

  const filtered: T[] = [];
  for (const item of items) {
    if (isFolder(item)) {
      const keptChildren = filterRequestItemsByTags(
        (item.items ?? []) as T[],
        includeTags,
        excludeTags,
        getEffectiveTags(getSavedFolderTags(item), inheritedTags)
      );
      if (keptChildren.length > 0) {
        filtered.push({ ...item, items: keptChildren });
      }
    } else if (isRequestItem(item)) {
      if (isRequestTagsIncluded(getEffectiveTags(item.tags, inheritedTags), includeTags, excludeTags)) {
        filtered.push(item);
      }
    } else {
      filtered.push(item);
    }
  }
  return filtered;
};

export const selectEnvironmentsByName = <E extends NamedEnvironment>(
  environments: E[],
  includeNames: string[] = [],
  excludeNames: string[] = []
): E[] => {
  const include = new Set(includeNames);
  const exclude = new Set(excludeNames);
  return environments.filter((env) => env.name != null && include.has(env.name) && !exclude.has(env.name));
};

const escapeHtmlText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const hardenScriptSequences = (value: string): string =>
  value.replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--');

const augmentDocsMetadata = (openCollection: DocsOpenCollection, metadata: ApiDocsMetadata): DocsOpenCollection => {
  const { collectionVersion, exportedAt, exportedUsing } = metadata;

  if (collectionVersion != null && collectionVersion !== '') {
    openCollection.info = { ...openCollection.info, version: String(collectionVersion) };
  } else if (openCollection.info) {
    delete openCollection.info.version;
  }

  openCollection.extensions = {
    ...openCollection.extensions,
    bruno: {
      ...openCollection.extensions?.bruno,
      ...(exportedAt ? { exportedAt } : {}),
      ...(exportedUsing ? { exportedUsing } : {})
    }
  };

  return openCollection;
};

export const stripGitCredentials = (url: string): string => {
  try {
    const parsed = new URL(url);
    if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && (parsed.username || parsed.password)) {
      parsed.username = '';
      parsed.password = '';
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
};

export const buildApiDocsHtml = (
  collectionName: string,
  embeddedCollectionData: string,
  options: ApiDocsHtmlOptions = {}
): string => {
  const assets = options.inlineAssets;
  if (!assets && !options.rendererBaseUrl) {
    throw new Error('API docs need the viewer files: pass inlineAssets, or rendererBaseUrl to load them from a server you run.');
  }
  // The file is one HTML page, so a closing script tag inside the bundle would end it early
  const embed = (code: string): string => code.replace(/<\/(script|style)/gi, '<\\/$1');
  const viewerTags = assets
    ? `<style>${embed(assets.css)}</style>
    <script>${embed(assets.js)}</script>`
    : `<link rel="stylesheet" href="${options.rendererBaseUrl}/api-docs/api-docs.css">
    <script src="${options.rendererBaseUrl}/api-docs/api-docs.js"></script>`;
  const gitLine = options.gitCollectionUrl
    ? `\n            repositoryUrl: ${hardenScriptSequences(JSON.stringify(stripGitCredentials(options.gitCollectionUrl)))},`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtmlText(collectionName)} - API Documentation</title>
    <style>
        body { margin: 0; padding: 0; }
        #opencollection-container { width: 100vw; height: 100vh; }
    </style>
    ${viewerTags}
</head>
<body>
    <div id="opencollection-container"></div>
    <script>
        const collectionData = ${embeddedCollectionData};
        Bruno.apiDocs(document.getElementById('opencollection-container'), {
            content: collectionData,${gitLine}
            theme: 'light'
        });
    </script>
</body>
</html>`;
};

const sanitizeDocsFileName = (name: string): string =>
  name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/^[.\s-]+/, '')
    .replace(/[.\s]+$/, '');

export const getApiDocsFileName = (collectionName: string | null | undefined): string =>
  `${sanitizeDocsFileName(collectionName ?? '') || 'collection'}-documentation.html`;

export const generateApiDocsHtml = (
  collection: DocsCollection,
  options: GenerateApiDocsOptions,
  deps: ApiDocsDependencies
): string => {
  const items = collection.items
    ? filterRequestItemsByTags(collection.items, options.tags?.include ?? [], options.tags?.exclude ?? [])
    : collection.items;

  const environments = options.environments
    ? selectEnvironmentsByName(
        collection.environments ?? [],
        options.environments.include ?? [],
        options.environments.exclude ?? []
      )
    : collection.environments;

  const scopedCollection: DocsCollection = { ...collection, items, environments };

  const openCollection = augmentDocsMetadata(deps.brunoToOpenCollection(scopedCollection), options);

  const yaml = deps.dumpYaml(openCollection, YAML_DUMP_OPTIONS);
  const embeddedCollectionData = hardenScriptSequences(deps.escapeString(yaml, JSESC_OPTIONS));

  const collectionName = openCollection.info?.name || collection.name || 'Untitled Collection';
  return buildApiDocsHtml(collectionName, embeddedCollectionData, {
    gitCollectionUrl: options.gitCollectionUrl,
    rendererBaseUrl: options.rendererBaseUrl,
    inlineAssets: options.inlineAssets
  });
};
