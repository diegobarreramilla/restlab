import { createSlice } from '@reduxjs/toolkit';

// Drives the bru→yml migration modal. Lives outside the collections slice because the
// collection is removed from the store while it migrates on disk — the modal (rendered
// at app level) must keep the collection's identity and progress through that window.
const initialState = {
  collectionUid: null,
  collectionPathname: null,
  collectionName: null,
  status: 'idle', // 'idle' | 'confirming' | 'migrating' | 'cancelling'
  phase: null, // 'parsing' | 'writing' | 'finalizing'
  current: 0,
  total: 0,
  // Where the committed migration kept the .bru backup; cleared when a new migration
  // modal opens, so the overview shows it only for the collection just migrated.
  completedBackupPath: null
};

export const collectionMigrationSlice = createSlice({
  name: 'collectionMigration',
  initialState,
  reducers: {
    showMigrateToYmlModal: (state, action) => {
      if (state.status !== 'idle') {
        return;
      }
      const { collectionUid, collectionPathname, collectionName } = action.payload;
      state.collectionUid = collectionUid;
      state.collectionPathname = collectionPathname;
      state.collectionName = collectionName;
      state.completedBackupPath = null;
      state.status = 'confirming';
    },
    hideMigrateToYmlModal: (state) => {
      if (state.status !== 'confirming') {
        return;
      }
      return initialState;
    },
    migrationStarted: (state) => {
      if (state.status !== 'confirming') {
        return;
      }
      state.status = 'migrating';
      state.phase = null;
      state.current = 0;
      state.total = 0;
    },
    migrationProgressEvent: (state, action) => {
      const { collectionUid, phase, current, total } = action.payload;
      if (state.collectionUid !== collectionUid || (state.status !== 'migrating' && state.status !== 'cancelling')) {
        return;
      }
      state.phase = phase;
      state.current = current;
      state.total = total;
    },
    migrationCancelRequested: (state) => {
      if (state.status !== 'migrating') {
        return;
      }
      state.status = 'cancelling';
    },
    migrationEnded: (state) => {
      state.status = 'idle';
      state.phase = null;
      state.current = 0;
      state.total = 0;
      // completedBackupPath intentionally survives so the collection overview can keep
      // showing where the .bru backup landed after a committed migration.
    },
    migrationCompleted: (state, action) => {
      const { collectionUid, backupPath } = action.payload;
      if (state.collectionUid !== collectionUid) {
        return;
      }
      state.completedBackupPath = typeof backupPath === 'string' ? backupPath : null;
    }
  }
});

export const {
  showMigrateToYmlModal,
  hideMigrateToYmlModal,
  migrationStarted,
  migrationProgressEvent,
  migrationCancelRequested,
  migrationCompleted,
  migrationEnded
} = collectionMigrationSlice.actions;

export default collectionMigrationSlice.reducer;
