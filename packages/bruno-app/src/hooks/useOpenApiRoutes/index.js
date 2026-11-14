import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import jsyaml from 'js-yaml';
import { buildRoutes } from 'utils/openapi-routes';

const parseDescription = (content) => {
  try {
    return JSON.parse(content);
  } catch (error) {
    try {
      return jsyaml.load(content);
    } catch (yamlError) {
      return null;
    }
  }
};

// The description a collection is synced with is kept by the main process; it is read once per collection
// and again when a sync changes it.
const useLinkedDescription = (collection) => {
  const syncConfig = collection.brunoConfig?.openapi?.[0];
  const isLinked = Boolean(syncConfig?.sourceUrl);
  const version = syncConfig?.specHash || syncConfig?.lastSyncDate || '';
  const [description, setDescription] = useState(null);

  useEffect(() => {
    if (!isLinked) {
      setDescription(null);
      return;
    }
    let cancelled = false;
    window.ipcRenderer
      ?.invoke('renderer:read-openapi-spec', { collectionPath: collection.pathname })
      .then((result) => {
        if (!cancelled) setDescription(result?.content ? parseDescription(result.content) : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLinked, version, collection.pathname]);

  return description;
};

/**
 * The routes the URL bar can suggest for a collection, read from descriptions already on this machine: the
 * one the collection is synced with and the ones open under API Specs. Nothing is fetched.
 */
const useOpenApiRoutes = (collection) => {
  const apiSpecs = useSelector((state) => state.apiSpec.apiSpecs);
  const linkedDescription = useLinkedDescription(collection);

  return useMemo(() => {
    const fromLinked = buildRoutes(linkedDescription, collection.name);
    const fromApiSpecs = apiSpecs.flatMap((apiSpec) => buildRoutes(apiSpec.resolvedJson || apiSpec.json, apiSpec.name));

    const seen = new Set();
    return [...fromLinked, ...fromApiSpecs].filter((route) => {
      const key = `${route.method} ${route.baseUrl}${route.path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [linkedDescription, apiSpecs, collection.name]);
};

export default useOpenApiRoutes;
