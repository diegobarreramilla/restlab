import { useEffect, useState, useSyncExternalStore } from 'react';

const DEFAULT_ROUTE_POLL_INTERVAL = 3000;

const subscribe = (onChange) => {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);

  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
};

const getSnapshot = () => navigator.onLine;

// Chromium reports "online" while any network interface is active, including Docker bridges, so on
// Linux the browser flag stays true after the Wi-Fi is switched off. The main process answers
// whether the system has a default route (reading a local file, no network request). It returns
// null where it cannot tell, and then the browser flag decides alone.
const useHasDefaultRoute = () => {
  const [hasDefaultRoute, setHasDefaultRoute] = useState(null);

  useEffect(() => {
    const { ipcRenderer } = window;
    if (!ipcRenderer) {
      return undefined;
    }

    let isActive = true;
    const refresh = () => {
      ipcRenderer.invoke('renderer:get-has-default-route')
        .then((value) => isActive && setHasDefaultRoute(value))
        .catch(() => isActive && setHasDefaultRoute(null));
    };

    refresh();
    const interval = setInterval(refresh, DEFAULT_ROUTE_POLL_INTERVAL);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, []);

  return hasDefaultRoute;
};

/**
 * Whether the machine looks connected to a network. It reflects the network state of the system,
 * not whether a given server is reachable.
 */
const useOnlineStatus = () => {
  const browserOnline = useSyncExternalStore(subscribe, getSnapshot);
  const hasDefaultRoute = useHasDefaultRoute();

  return browserOnline && hasDefaultRoute !== false;
};

export default useOnlineStatus;
