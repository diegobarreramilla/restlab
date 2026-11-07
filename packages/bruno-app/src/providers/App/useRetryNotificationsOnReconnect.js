import useOnReconnect from 'hooks/useOnReconnect';

// The announcements feed is only fetched when the user opted in (the main process checks the
// preference), so asking again on reconnect sends nothing for everyone else.
const useRetryNotificationsOnReconnect = () => {
  useOnReconnect(() => window.ipcRenderer?.send('renderer:notifications-opened'));
};

export default useRetryNotificationsOnReconnect;
