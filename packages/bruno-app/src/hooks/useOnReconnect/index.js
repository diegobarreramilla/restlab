import { useEffect, useRef } from 'react';
import useOnlineStatus from 'hooks/useOnlineStatus';
import usePrevious from 'hooks/usePrevious';

/**
 * Runs `callback` each time the machine goes from offline to online. It does not run on startup.
 */
const useOnReconnect = (callback) => {
  const isOnline = useOnlineStatus();
  const wasOnline = usePrevious(isOnline);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (isOnline && wasOnline === false) {
      callbackRef.current();
    }
  }, [isOnline]);
};

export default useOnReconnect;
