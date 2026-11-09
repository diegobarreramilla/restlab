import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { IconFileCode, IconCopy, IconClock, IconFolder, IconTrash } from '@tabler/icons';
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

  if (collection.format === 'bru') {
    return (
      <StyledWrapper>
        <div className="migration-section">
          <div className="migration-card">
            <div className="card-head">
              <div className="icon-box migration flex-shrink-0 p-3 rounded-lg">
                <IconFileCode className="w-5 h-5" stroke={1.5} />
              </div>
              <div className="card-title-block">
                <div className="card-title">
                  Migrate to YML file format
                  <span className="format-badge">BRU</span>
                </div>
                <div className="card-description">
                  This collection is stored in BRU format. Switch to YML to use the current file format.
                </div>
              </div>
            </div>

            <div className="backup-details" data-testid="migration-backup-notice">
              <div>
                <div className="field-label">Backup location</div>
                <code className="path-box" title={rootPath}>
                  {rootPath || '…'}
                </code>
              </div>
              <div className="meta-row">
                <IconClock size={14} stroke={1.5} aria-hidden="true" />
                <span>
                  A copy of every <code>.bru</code> file is kept here before switching
                  {retentionDays ? `, and deleted automatically after ${retentionDays} days.` : '.'}
                </span>
              </div>
            </div>

            <div className="card-actions">
              <Button
                data-testid="migrate-collection-to-yml-button"
                size="sm"
                color="primary"
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
        <div className="migration-card">
          <div className="card-head">
            <div className="icon-box migration flex-shrink-0 p-3 rounded-lg">
              <IconFileCode className="w-5 h-5" stroke={1.5} />
            </div>
            <div className="card-title-block">
              <div className="card-title">
                Migrated to YML file format
                <span className="format-badge done">YML</span>
              </div>
              <div className="card-description" data-testid="migration-completed-notice">
                This collection is stored in YML format. The original <code>.bru</code> files were kept as a backup.
              </div>
            </div>
          </div>

          <div className="backup-details">
            <div>
              <div className="field-label">Backup location</div>
              <code className="path-box" title={backup.backupPath} data-testid="migration-backup-path">
                {backup.backupPath}
              </code>
            </div>
            <div className="meta-row" data-testid="migration-backup-expiry">
              <IconClock size={14} stroke={1.5} aria-hidden="true" />
              <span>
                Deleted automatically on {new Date(backup.expiresAt).toLocaleDateString()} ({backup.retentionDays} days
                after the migration).
              </span>
            </div>
          </div>

          <div className="card-actions" data-testid="migration-backup-actions">
            <button
              type="button"
              className="ghost-action"
              data-testid="migration-copy-backup-path"
              onClick={copyBackupPath}
            >
              <IconCopy strokeWidth={1.5} size={14} aria-hidden="true" />
              Copy path
            </button>
            <button
              type="button"
              className="ghost-action"
              data-testid="migration-reveal-backup"
              onClick={revealBackupPath}
            >
              <IconFolder strokeWidth={1.5} size={14} aria-hidden="true" />
              {revealInFolderLabel}
            </button>
            <span className="spacer" />
            {confirmingDelete ? (
              <>
                <span className="confirm-text">Delete the copy for good?</span>
                <button
                  type="button"
                  className="ghost-action danger"
                  data-testid="migration-confirm-delete-backup"
                  onClick={handleDeleteBackup}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="ghost-action"
                  data-testid="migration-cancel-delete-backup"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="ghost-action danger"
                data-testid="migration-delete-backup"
                onClick={() => setConfirmingDelete(true)}
              >
                <IconTrash strokeWidth={1.5} size={14} aria-hidden="true" />
                Delete backup
              </button>
            )}
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Migration;
