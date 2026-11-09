import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

global.React = React;

jest.mock('./StyledWrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('ui/Button', () => ({ children, ...props }) => <button {...props}>{children}</button>);

const BACKUP_ROOT = '/home/diego/.config/restlab/tmp/yml-migration';
const BACKUP_PATH = `${BACKUP_ROOT}/backup-Abc123`;
const mockShowMigrateToYmlModal = jest.fn((_payload) => () => Promise.resolve());
const mockShowInFolder = jest.fn((_pathname) => () => Promise.resolve());

jest.mock('providers/ReduxStore/slices/collection-migration', () => ({
  showMigrateToYmlModal: (payload) => mockShowMigrateToYmlModal(payload)
}));
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  showInFolder: (pathname) => mockShowInFolder(pathname)
}));

import Migration from './index';

const theme = {
  text: '#1f1f1f',
  textLink: '#4b6e8f',
  font: { size: { base: '14px', sm: '12px', xs: '11px' } },
  colors: { text: { muted: '#8a8a8a' } }
};

const DAY_MS = 24 * 60 * 60 * 1000;
const CREATED_AT = new Date('2026-11-08T12:00:00').getTime();
const BACKUP = {
  backupPath: BACKUP_PATH,
  createdAt: CREATED_AT,
  expiresAt: CREATED_AT + 30 * DAY_MS,
  retentionDays: 30
};

const renderMigration = ({ format = 'bru' } = {}) => {
  const store = configureStore({ reducer: { app: () => ({}) } });
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <Migration collection={{ uid: 'col-1', name: 'demo', pathname: '/c/demo', format }} />
      </ThemeProvider>
    </Provider>
  );
};

describe('CollectionSettings overview — Migration backup notice', () => {
  let clipboardSpy;
  let backupOnDisk;
  let deleteBackupImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    backupOnDisk = BACKUP;
    deleteBackupImpl = () => Promise.resolve(true);
    clipboardSpy = jest.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: clipboardSpy }, configurable: true });
    window.ipcRenderer = {
      invoke: jest.fn((channel, ...args) => {
        if (channel === 'renderer:get-yml-migration-backup-info') {
          return Promise.resolve({ rootPath: BACKUP_ROOT, retentionDays: 30 });
        }
        if (channel === 'renderer:get-yml-migration-backup') return Promise.resolve(backupOnDisk);
        if (channel === 'renderer:delete-yml-migration-backup') return deleteBackupImpl(...args);
        return Promise.resolve(undefined);
      }),
      send: jest.fn(),
      on: jest.fn()
    };
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('announces where the .bru copy will be kept and that it is deleted after 30 days', async () => {
    renderMigration({ format: 'bru' });

    await waitFor(() => {
      expect(screen.getByTestId('migration-backup-notice')).toHaveTextContent(BACKUP_ROOT);
    });
    expect(screen.getByTestId('migration-backup-notice')).toHaveTextContent('deletes it automatically after 30 days');
  });

  it('does not guess the backup location: without an answer it shows a placeholder', () => {
    window.ipcRenderer = { invoke: jest.fn(() => Promise.reject(new Error('no'))), send: jest.fn(), on: jest.fn() };
    renderMigration({ format: 'bru' });

    expect(screen.getByTestId('migration-backup-notice')).toHaveTextContent('…');
  });

  it('offers the conversion for bru collections and opens the modal', () => {
    renderMigration({ format: 'bru' });

    fireEvent.click(screen.getByTestId('migrate-collection-to-yml-button'));
    expect(mockShowMigrateToYmlModal).toHaveBeenCalledWith({
      collectionUid: 'col-1',
      collectionPathname: '/c/demo',
      collectionName: 'demo'
    });
  });

  it('looks the backup up by collection path, so it is still shown after a restart', async () => {
    renderMigration({ format: 'yml' });

    expect(await screen.findByText('Migrated to YML file format')).toBeInTheDocument();
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:get-yml-migration-backup', '/c/demo');
    expect(screen.getByTestId('migration-backup-path')).toHaveTextContent(BACKUP_PATH);
  });

  it('states when the copy will be deleted automatically', async () => {
    renderMigration({ format: 'yml' });

    const expiry = await screen.findByTestId('migration-backup-expiry');
    expect(expiry).toHaveTextContent(new Date(BACKUP.expiresAt).toLocaleDateString());
    expect(expiry).toHaveTextContent('30 days after the migration');
  });

  it('copies and reveals the backup path', async () => {
    renderMigration({ format: 'yml' });

    fireEvent.click(await screen.findByTestId('migration-copy-backup-path'));
    expect(clipboardSpy).toHaveBeenCalledWith(BACKUP_PATH);

    fireEvent.click(screen.getByTestId('migration-reveal-backup'));
    expect(mockShowInFolder).toHaveBeenCalledWith(BACKUP_PATH);
  });

  it('deletes the backup only after a confirmation, then hides the section', async () => {
    const { container } = renderMigration({ format: 'yml' });

    fireEvent.click(await screen.findByTestId('migration-delete-backup'));
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalledWith('renderer:delete-yml-migration-backup', expect.anything());

    fireEvent.click(screen.getByTestId('migration-confirm-delete-backup'));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:delete-yml-migration-backup', BACKUP_PATH);
  });

  it('keeps the backup when the confirmation is cancelled', async () => {
    renderMigration({ format: 'yml' });

    fireEvent.click(await screen.findByTestId('migration-delete-backup'));
    fireEvent.click(screen.getByTestId('migration-cancel-delete-backup'));

    expect(screen.getByTestId('migration-backup-path')).toBeInTheDocument();
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalledWith('renderer:delete-yml-migration-backup', expect.anything());
  });

  it('keeps showing the backup if deleting it fails', async () => {
    deleteBackupImpl = () => Promise.reject(new Error('EPERM'));
    renderMigration({ format: 'yml' });

    fireEvent.click(await screen.findByTestId('migration-delete-backup'));
    fireEvent.click(screen.getByTestId('migration-confirm-delete-backup'));

    await waitFor(() => expect(screen.getByTestId('migration-delete-backup')).toBeInTheDocument());
    expect(screen.getByTestId('migration-backup-path')).toBeInTheDocument();
  });

  it('renders nothing for a yml collection that has no backup', async () => {
    backupOnDisk = null;
    const { container } = renderMigration({ format: 'yml' });

    await waitFor(() => expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:get-yml-migration-backup', '/c/demo'));
    expect(container).toBeEmptyDOMElement();
  });
});
