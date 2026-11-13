import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { formatIpcError } from 'utils/common/error';

/**
 * The Git state of one collection and the way to act on it. `version` goes up after every refresh, so the
 * views that load their own data (history, blame, stashes) know when to load it again.
 */
const useGitRepository = (collectionPath) => {
  const [overview, setOverview] = useState(null);
  const [version, setVersion] = useState(0);

  const invoke = useCallback(
    (action, payload = {}) => window.ipcRenderer.invoke(`renderer:git-${action}`, { collectionPath, ...payload }),
    [collectionPath]
  );

  const refresh = useCallback(async () => {
    try {
      setOverview(await invoke('overview'));
    } catch (error) {
      setOverview({ gitAvailable: true, isRepository: false, error: formatIpcError(error) });
    }
    setVersion((current) => current + 1);
  }, [invoke]);

  // Runs an action and reloads the state whether it worked or not, so the screen never shows a stale list.
  const run = useCallback(
    async (action, payload) => {
      try {
        const result = await invoke(action, payload);
        await refresh();
        return { ok: true, result };
      } catch (error) {
        toast.error(formatIpcError(error) || 'The Git operation failed');
        await refresh();
        return { ok: false };
      }
    },
    [invoke, refresh]
  );

  useEffect(() => {
    refresh();
    // Files change outside the app (an editor, a terminal); coming back to the window is when that shows.
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  return { overview, version, invoke, refresh, run };
};

export default useGitRepository;
