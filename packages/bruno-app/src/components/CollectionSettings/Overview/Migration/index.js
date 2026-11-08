import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconFileCode, IconTransform, IconCopy } from '@tabler/icons';
import toast from 'react-hot-toast';
import { showMigrateToYmlModal } from 'providers/ReduxStore/slices/collection-migration';
import { showInFolder } from 'providers/ReduxStore/slices/collections/actions';
import { getRevealInFolderLabel } from 'utils/common/platform';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const Migration = ({ collection }) => {
  const dispatch = useDispatch();
  const revealInFolderLabel = getRevealInFolderLabel();
  // Read-only location the migration reports over IPC; the UI never hardcodes it.
  const [backupRootPath, setBackupRootPath] = useState('');
  const completedBackupPath = useSelector((state) => {
    const migration = state.collectionMigration;
    return collection?.uid && migration?.collectionUid === collection.uid
      ? migration?.completedBackupPath
      : null;
  });

  useEffect(() => {
    let isSubscribed = true;
    window?.ipcRenderer
      ?.invoke('renderer:get-yml-migration-backup-root')
      .then((rootPath) => {
        if (isSubscribed && typeof rootPath === 'string') setBackupRootPath(rootPath);
      })
      .catch((error) => console.error('Could not read the migration backup location', error));
    return () => {
      isSubscribed = false;
    };
  }, []);

  // Only bru collections can migrate; a freshly migrated yml collection gets the
  // backup notice until a new migration modal clears it.
  if (collection.format !== 'bru' && !completedBackupPath) {
    return null;
  }

  const handleMigrateClick = () => {
    dispatch(
      showMigrateToYmlModal({
        collectionUid: collection.uid,
        collectionPathname: collection.pathname,
        collectionName: collection.name
      })
    );
  };

  if (collection.format === 'bru') {
    return (
      <StyledWrapper>
        <div className="migration-section">
          <div className="text-lg font-medium flex items-center gap-2 mb-4">
            <IconTransform size={20} stroke={1.5} />
            Migration
          </div>

          <div className="flex items-start">
            <div className="icon-box migration flex-shrink-0 p-3 rounded-lg">
              <IconFileCode className="w-5 h-5" stroke={1.5} />
            </div>
            <div className="ml-4">
              <div className="font-medium">Migrate to YML file format</div>
              <div className="my-1 text-muted text-sm">
                This collection is stored in BRU format.{' '}
                Switch to YML.
              </div>
              <div className="my-1 text-muted text-sm" data-testid="migration-backup-notice">
                Before switching, a copy of every <code>.bru</code> file is kept at{' '}
                <code className="backup-path" title={backupRootPath}>
                  {backupRootPath || '…'}
                </code>
              </div>
              <Button
                data-testid="migrate-collection-to-yml-button"
                size="sm"
                color="primary"
                className="mt-2"
                onClick={handleMigrateClick}
              >
                Convert to YML
              </Button>
            </div>
          </div>
        </div>
      </StyledWrapper>
    );
  }

  const copyBackupPath = () => {
    navigator.clipboard
      .writeText(completedBackupPath)
      .then(() => toast.success('Copied'))
      .catch(() => toast.error('Failed to copy path'));
  };

  const revealBackupPath = () => {
    dispatch(showInFolder(completedBackupPath)).catch(() => {
      toast.error('Error opening the folder');
    });
  };

  return (
    <StyledWrapper>
      <div className="migration-section">
        <div className="text-lg font-medium flex items-center gap-2 mb-4">
          <IconTransform size={20} stroke={1.5} />
          Migration
        </div>

        <div className="flex items-start">
          <div className="icon-box migration flex-shrink-0 p-3 rounded-lg">
            <IconFileCode className="w-5 h-5" stroke={1.5} />
          </div>
          <div className="ml-4">
            <div className="font-medium">Migrated to YML file format</div>
            <div className="my-1 text-muted text-sm" data-testid="migration-completed-notice">
              This collection is stored in YML format. A copy of the original <code>.bru</code> files is kept at{' '}
              <code className="backup-path" title={completedBackupPath} data-testid="migration-backup-path">
                {completedBackupPath}
              </code>
            </div>
            <div className="flex items-center gap-2 mt-1" data-testid="migration-backup-actions">
              <button
                type="button"
                className="backup-path-action"
                data-testid="migration-copy-backup-path"
                onClick={copyBackupPath}
              >
                <IconCopy strokeWidth={1.5} size={14} aria-hidden="true" />
                Copy
              </button>
              <button
                type="button"
                className="backup-path-action"
                data-testid="migration-reveal-backup"
                onClick={revealBackupPath}
              >
                {revealInFolderLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Migration;
