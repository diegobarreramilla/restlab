import isEqual from 'lodash/isEqual';
import { flattenItems, isItemARequest } from 'utils/collections';

/**
 * Unsaved changes of requests, in the shape kept on disk so they survive the app closing unexpectedly:
 * the path of each request file mapped to its saved version (`base`) and its edited version (`draft`).
 */

// Entries get a new uid every time a file is loaded, so two versions are compared without them.
const withoutUids = (value) => {
  if (Array.isArray(value)) return value.map(withoutUids);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'uid').map(([key, entry]) => [key, withoutUids(entry)]));
  }
  return value;
};

const isLoadedRequest = (item) => isItemARequest(item) && !item.partial && !item.loading && !item.isTransient && item.pathname && item.request;

/** Every request with unsaved changes in the open collections. */
export const collectUnsavedDrafts = (collections) => {
  const drafts = {};
  for (const collection of collections || []) {
    for (const item of flattenItems(collection.items)) {
      if (!isLoadedRequest(item) || !item.draft?.request) continue;
      drafts[item.pathname] = {
        base: withoutUids(item.request),
        draft: { request: item.draft.request, ...(item.draft.settings ? { settings: item.draft.settings } : {}) }
      };
    }
  }
  return drafts;
};

/**
 * Decides what to do with the drafts kept from a previous run, for the requests that are loaded by now.
 * A draft goes back onto its request only if the file still holds the version the draft was made from;
 * otherwise the file changed in the meantime and the draft is dropped instead of overwriting it later.
 * Entries whose request is not loaded yet are left pending.
 */
export const planDraftRestore = (pending, collections) => {
  const restores = [];
  const settled = [];
  if (!Object.keys(pending).length) return { restores, settled };

  for (const collection of collections || []) {
    for (const item of flattenItems(collection.items)) {
      const kept = item.pathname ? pending[item.pathname] : null;
      if (!kept || !isLoadedRequest(item)) continue;

      settled.push(item.pathname);
      if (!item.draft && isEqual(withoutUids(item.request), kept.base)) {
        restores.push({ collectionUid: collection.uid, itemUid: item.uid, draft: kept.draft });
      }
    }
  }
  return { restores, settled };
};
