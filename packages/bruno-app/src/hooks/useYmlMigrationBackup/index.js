import { useCallback, useEffect, useState } from 'react';

// Reads, through the main process, where the .bru copy made by a BRU -> YML migration is
// kept and how long it lives. `backup` is the copy of this collection (null when none).
const useYmlMigrationBackup = (collectionPathname) => {
  const [info, setInfo] = useState({ rootPath: '', retentionDays: null });
  const [backup, setBackup] = useState(null);

  useEffect(() => {
    let isSubscribed = true;
    const { ipcRenderer } = window;
    ipcRenderer
      ?.invoke('renderer:get-yml-migration-backup-info')
      .then((value) => {
        if (isSubscribed && value) setInfo(value);
      })
      .catch((error) => console.error('Could not read the migration backup location', error));
    if (collectionPathname) {
      ipcRenderer
        ?.invoke('renderer:get-yml-migration-backup', collectionPathname)
        .then((value) => {
          if (isSubscribed) setBackup(value || null);
        })
        .catch((error) => console.error('Could not read the migration backup', error));
    }
    return () => {
      isSubscribed = false;
    };
  }, [collectionPathname]);

  const deleteBackup = useCallback(async () => {
    await window.ipcRenderer.invoke('renderer:delete-yml-migration-backup', backup.backupPath);
    setBackup(null);
  }, [backup]);

  return { ...info, backup, deleteBackup };
};

export default useYmlMigrationBackup;
