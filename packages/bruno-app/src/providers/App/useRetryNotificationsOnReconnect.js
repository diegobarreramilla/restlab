import { useEffect } from 'react';

// The announcements feed is only fetched when the user opted in (the main process checks the
// preference), so asking again on reconnect sends nothing for everyone else.
const useRetryNotificationsOnReconnect = () => {
  useEffect(() => {
    const retry = () => window.ipcRenderer?.send('renderer:notifications-opened');
    window.addEventListener('online', retry);

    return () => window.removeEventListener('online', retry);
  }, []);
};

export default useRetryNotificationsOnReconnect;
