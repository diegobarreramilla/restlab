import { useEffect, useState } from 'react';

// What strict network mode has stopped since the app started, read from the main process, which does the
// blocking. Zero is the normal answer: the app does not connect anywhere by itself.
const StrictNetworkStatus = ({ enabled }) => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    window?.ipcRenderer
      ?.invoke('renderer:get-strict-network-status')
      .then((result) => !cancelled && setStatus(result))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled || !status) {
    return null;
  }

  const { blockedCount, blockedHosts } = status;

  return (
    <div className="privacy-path-hint strict-network-status" data-testid="strict-network-status">
      {blockedCount === 0
        ? 'Nothing has been blocked since RestLab started.'
        : `Blocked since RestLab started: ${blockedCount} ${blockedCount === 1 ? 'connection' : 'connections'} to ${blockedHosts.map(({ host }) => host).join(', ')}.`}
    </div>
  );
};

export default StrictNetworkStatus;
