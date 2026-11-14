/**
 * Unsaved drafts middleware
 *
 * Keeps the unsaved changes of requests on disk so they survive the app closing unexpectedly, and puts
 * them back when their requests are loaded again. A draft the user saves or discards is forgotten.
 */

import toast from 'react-hot-toast';
import { collectUnsavedDrafts, planDraftRestore } from 'utils/unsaved-drafts';
import { restoreRequestDraft } from '../../slices/collections';

const { ipcRenderer } = window;

const DEBOUNCE_MS = 1000;
// Saving or discarding is the user's decision about a draft, so it reaches the disk before anything else
// can happen, such as the app quitting right after "Don't save".
const WRITE_AT_ONCE = new Set(['collections/saveRequest', 'collections/deleteRequestDraft']);

export const createUnsavedDraftsMiddleware = ({ ipc = ipcRenderer, notify = (message) => toast.success(message) } = {}) => {
  // Drafts kept from the previous run whose requests are not loaded yet; null until they have been read.
  let pending = null;
  let lastWritten = null;
  let timer = null;
  let restoredCount = 0;

  const write = (getState) => {
    timer = null;
    const drafts = { ...pending, ...collectUnsavedDrafts(getState().collections.collections) };
    const serialized = JSON.stringify(drafts);
    if (serialized === lastWritten) return;
    lastWritten = serialized;
    ipc.invoke('renderer:unsaved-drafts:save', drafts).catch(() => {});
  };

  const restore = ({ dispatch, getState }) => {
    const { restores, settled } = planDraftRestore(pending, getState().collections.collections);
    if (!settled.length) return;

    settled.forEach((pathname) => delete pending[pathname]);
    restores.forEach((payload) => dispatch(restoreRequestDraft(payload)));
    restoredCount += restores.length;

    if (!Object.keys(pending).length && restoredCount > 0) {
      notify(restoredCount === 1 ? 'Recovered the unsaved changes of 1 request' : `Recovered the unsaved changes of ${restoredCount} requests`);
      restoredCount = 0;
    }
  };

  return (store) => {
    ipc
      ?.invoke('renderer:unsaved-drafts:get')
      .then((kept) => {
        pending = kept && typeof kept === 'object' ? { ...kept } : {};
        lastWritten = JSON.stringify(pending);
        restore(store);
      })
      .catch(() => {
        pending = {};
      });

    return (next) => (action) => {
      const result = next(action);
      if (pending === null || typeof action?.type !== 'string' || !action.type.startsWith('collections/')) {
        return result;
      }

      restore(store);

      if (WRITE_AT_ONCE.has(action.type)) {
        clearTimeout(timer);
        write(store.getState);
      } else {
        clearTimeout(timer);
        timer = setTimeout(() => write(store.getState), DEBOUNCE_MS);
      }
      return result;
    };
  };
};

export const unsavedDraftsMiddleware = createUnsavedDraftsMiddleware();
