import React from 'react';
import { IconWifiOff } from '@tabler/icons';
import StatusBadge from 'ui/StatusBadge';
import useOnlineStatus from 'hooks/useOnlineStatus';

const OfflineBadge = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      className="flex items-center mr-2"
      role="status"
      data-testid="offline-badge"
      title="No network connection. Your collections and requests to local servers keep working."
    >
      <StatusBadge status="warning" size="sm" radius="xl" leftSection={<IconWifiOff size={12} strokeWidth={1.5} />}>
        Offline mode
      </StatusBadge>
    </div>
  );
};

export default OfflineBadge;
