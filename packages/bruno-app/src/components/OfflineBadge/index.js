import React from 'react';
import useOnlineStatus from 'hooks/useOnlineStatus';
import StyledWrapper from './StyledWrapper';

const OfflineBadge = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <StyledWrapper
      role="status"
      data-testid="offline-badge"
      data-state="offline"
      title="No network connection. Your collections and requests to local servers keep working."
    >
      <span className="offline-label">Offline</span>
      <span className="offline-detail">Working locally</span>
    </StyledWrapper>
  );
};

export default OfflineBadge;
