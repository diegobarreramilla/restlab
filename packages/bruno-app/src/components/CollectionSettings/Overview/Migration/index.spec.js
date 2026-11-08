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

const renderMigration = ({ format = 'bru', completedBackupPath = null, collectionUid = 'col-1', migrationCollectionUid = 'col-1' } = {}) => {
  const store = configureStore({
    reducer: {
      collectionMigration: () => ({
        collectionUid: migrationCollectionUid,
        completedBackupPath,
        status: 'idle'
      })
    }
  });
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <Migration collection={{ uid: collectionUid, name: 'demo', pathname: '/c/demo', format }} />
      </ThemeProvider>
    </Provider>
  );
};

describe('CollectionSettings overview — Migration backup notice', () => {
  let invokeSpy;
  let clipboardSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    clipboardSpy = jest.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: clipboardSpy }, configurable: true });
    invokeSpy = jest.fn((channel) => {
      if (channel === 'renderer:get-yml-migration-backup-root') return Promise.resolve(BACKUP_ROOT);
      return Promise.resolve(undefined);
    });
    window.ipcRenderer = { invoke: invokeSpy, send: jest.fn(), on: jest.fn() };
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('announces where the .bru copy will be kept before migrating, straight from the IPC', async () => {
    renderMigration({ format: 'bru' });

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:get-yml-migration-backup-root');
    await waitFor(() => {
      expect(screen.getByTestId('migration-backup-notice')).toHaveTextContent(BACKUP_ROOT);
    });
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

  it('shows the real backup path with copy and reveal after a committed migration', () => {
    renderMigration({ format: 'yml', completedBackupPath: BACKUP_PATH });

    expect(screen.getByText('Migrated to YML file format')).toBeInTheDocument();
    expect(screen.getByTestId('migration-backup-path')).toHaveTextContent(BACKUP_PATH);

    fireEvent.click(screen.getByTestId('migration-copy-backup-path'));
    expect(clipboardSpy).toHaveBeenCalledWith(BACKUP_PATH);

    fireEvent.click(screen.getByTestId('migration-reveal-backup'));
    expect(mockShowInFolder).toHaveBeenCalledWith(BACKUP_PATH);
  });

  it('renders nothing for a yml collection that never migrated in this session', () => {
    const { container } = renderMigration({ format: 'yml', completedBackupPath: null });
    expect(container).toBeEmptyDOMElement();
  });

  it('does not leak another collection\u2019s backup path', () => {
    const { container } = renderMigration({ format: 'yml', collectionUid: 'col-2', migrationCollectionUid: 'col-1', completedBackupPath: BACKUP_PATH });
    expect(container).toBeEmptyDOMElement();
  });
});
