import { useSyncExternalStore } from 'react';

const subscribe = (onChange) => {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);

  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
};

const getSnapshot = () => navigator.onLine;

/**
 * Whether the operating system reports a network connection. It follows the browser `online` and
 * `offline` events, so it reflects the network interface and not whether a given server is reachable.
 */
const useOnlineStatus = () => useSyncExternalStore(subscribe, getSnapshot);

export default useOnlineStatus;
