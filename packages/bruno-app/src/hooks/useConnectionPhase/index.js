import { useEffect, useState } from 'react';

export const RESTORED_DURATION_MS = 2400;
export const EXIT_DURATION_MS = 280;

/**
 * Follows a connection through the phases of its notice:
 * `hidden` (online, nothing to show), `offline`, `restored` (just came back, shown briefly),
 * and `leaving` (fading out before it is removed).
 */
const useConnectionPhase = (isOnline) => {
  const [phase, setPhase] = useState(isOnline ? 'hidden' : 'offline');

  // Derive the phase that the connection itself dictates while rendering, so there is no frame
  // that shows the previous state.
  if (!isOnline && phase !== 'offline') {
    setPhase('offline');
  } else if (isOnline && phase === 'offline') {
    setPhase('restored');
  }

  useEffect(() => {
    if (phase === 'restored') {
      const timeout = setTimeout(() => setPhase('leaving'), RESTORED_DURATION_MS);
      return () => clearTimeout(timeout);
    }

    if (phase === 'leaving') {
      const timeout = setTimeout(() => setPhase('hidden'), EXIT_DURATION_MS);
      return () => clearTimeout(timeout);
    }

    return undefined;
  }, [phase]);

  return phase;
};

export default useConnectionPhase;
