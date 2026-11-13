import { useEffect, useState } from 'react';

/**
 * Loads one read-only piece of Git data and loads it again when `version` changes. `payload` must be stable
 * across renders that mean the same query: it is compared by its JSON text.
 */
const useGitQuery = ({ invoke, action, payload, version, enabled = true }) => {
  const [state, setState] = useState({ data: null, loading: enabled });
  const payloadKey = JSON.stringify(payload ?? {});

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false });
      return undefined;
    }
    let cancelled = false;
    setState((current) => ({ ...current, loading: true }));
    invoke(action, JSON.parse(payloadKey))
      .then((data) => !cancelled && setState({ data, loading: false }))
      .catch(() => !cancelled && setState({ data: null, loading: false }));
    return () => {
      cancelled = true;
    };
  }, [invoke, action, payloadKey, version, enabled]);

  return state;
};

export default useGitQuery;
