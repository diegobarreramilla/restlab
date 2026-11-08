import { useCallback, useRef, useState } from 'react';

/**
 * State of an AI request preview panel.
 *
 * `fetchPreview` receives the argument given to `open` and returns what the main process built (or
 * `{ error }`). A newer call supersedes an older one, so a slow answer never overwrites a fresher one,
 * and closing the panel drops whatever is still on its way.
 *
 * `mode` is 'look' for a read-only view and 'review' for a step that waits for approval. The last
 * preview stays on screen while a refresh is under way, so the panel does not flicker as you type.
 */
const useAiPreview = (fetchPreview) => {
  const [state, setState] = useState(null);
  const sequence = useRef(0);

  const open = useCallback(async (mode, arg) => {
    const id = ++sequence.current;
    setState((current) => ({ mode, arg, status: 'loading', preview: current?.preview ?? null, error: null }));

    try {
      const result = await fetchPreview(arg);
      if (id !== sequence.current) return;

      if (result?.error) {
        setState((current) => current && { ...current, status: 'error', preview: null, error: result.error });
      } else {
        setState((current) => current && { ...current, status: 'ready', preview: result, error: null });
      }
    } catch (err) {
      if (id !== sequence.current) return;
      setState((current) => current && {
        ...current,
        status: 'error',
        preview: null,
        error: err?.message || 'Could not prepare the preview'
      });
    }
  }, [fetchPreview]);

  const close = useCallback(() => {
    sequence.current += 1;
    setState(null);
  }, []);

  return { state, open, close };
};

export default useAiPreview;
