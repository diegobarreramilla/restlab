import React from 'react';
import useOnlineStatus from 'hooks/useOnlineStatus';
import useConnectionPhase from 'hooks/useConnectionPhase';
import StyledWrapper from './StyledWrapper';

const OFFLINE_TITLE = 'No network connection. Your collections and requests to local servers keep working.';
const RESTORED_TITLE = 'Connection restored.';

const OfflineBadge = () => {
  const isOnline = useOnlineStatus();
  const phase = useConnectionPhase(isOnline);

  if (phase === 'hidden') {
    return null;
  }

  const isOffline = phase === 'offline';

  return (
    <StyledWrapper
      role="status"
      data-testid="offline-badge"
      data-state={phase}
      title={isOffline ? OFFLINE_TITLE : RESTORED_TITLE}
    >
      <span className="label-stack">
        <span className="offline-label" data-active={isOffline} aria-hidden={!isOffline}>Offline</span>
        <span className="restored-label" data-active={!isOffline} aria-hidden={isOffline}>Back online</span>
      </span>
      <span className="offline-detail" data-active={isOffline} aria-hidden={!isOffline}>Working locally</span>
    </StyledWrapper>
  );
};

export default OfflineBadge;
