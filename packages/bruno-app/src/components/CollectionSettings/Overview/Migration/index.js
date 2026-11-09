import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { IconFileCode, IconTransform, IconCopy } from '@tabler/icons';
import toast from 'react-hot-toast';
import { showMigrateToYmlModal } from 'providers/ReduxStore/slices/collection-migration';
import { showInFolder } from 'providers/ReduxStore/slices/collections/actions';
import { getRevealInFolderLabel } from 'utils/common/platform';
import useYmlMigrationBackup from 'hooks/useYmlMigrationBackup';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const Migration = ({ collection }) => {
  const dispatch = useDispatch();
  const revealInFolderLabel = getRevealInFolderLabel();
  const { rootPath, retentionDays, backup, deleteBackup } = useYmlMigrationBackup(collection.pathname);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Only bru collections can migrate; a yml collection shows the section only while
  // it still has the .bru copy its migration left behind.
  if (collection.format !== 'bru' && !backup) {
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

  const retentionNotice = retentionDays ? `, and deletes it automatically after ${retentionDays} days` : '';

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
                <code className="backup-path" title={rootPath}>
                  {rootPath || '…'}
                </code>
                {retentionNotice}.
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
      .writeText(backup.backupPath)
      .then(() => toast.success('Copied'))
      .catch(() => toast.error('Failed to copy path'));
  };

  const revealBackupPath = () => {
    dispatch(showInFolder(backup.backupPath)).catch(() => {
      toast.error('Error opening the folder');
    });
  };

  const handleDeleteBackup = () => {
    deleteBackup()
      .catch(() => toast.error('Failed to delete the backup'))
      .finally(() => setConfirmingDelete(false));
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
              <code className="backup-path" title={backup.backupPath} data-testid="migration-backup-path">
                {backup.backupPath}
              </code>
            </div>
            <div className="my-1 text-muted text-sm" data-testid="migration-backup-expiry">
              It will be deleted automatically on {new Date(backup.expiresAt).toLocaleDateString()} ({backup.retentionDays}{' '}
              days after the migration).
            </div>
            <div className="flex items-center gap-3 mt-1" data-testid="migration-backup-actions">
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
              {confirmingDelete ? (
                <>
                  <span className="text-sm">Delete the copy for good?</span>
                  <button
                    type="button"
                    className="backup-path-action danger"
                    data-testid="migration-confirm-delete-backup"
                    onClick={handleDeleteBackup}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="backup-path-action"
                    data-testid="migration-cancel-delete-backup"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="backup-path-action danger"
                  data-testid="migration-delete-backup"
                  onClick={() => setConfirmingDelete(true)}
                >
                  Delete backup
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Migration;
