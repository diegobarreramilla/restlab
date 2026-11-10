import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

global.React = React;

jest.mock('./StyledWrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('ui/Button', () => ({ children, icon, color, variant, size, ...props }) => <button {...props}>{children}</button>);
jest.mock('components/Modal', () => ({ children }) => <div>{children}</div>);
jest.mock('components/SearchInput', () => () => null);
jest.mock('components/Help', () => () => null);
jest.mock('components/PathDisplay/index', () => () => null);
jest.mock('./CollectionListItem', () => () => null);
jest.mock('./FolderBreadcrumbs', () => () => null);
// The component re-runs its reset effect whenever `reset` changes identity, so the mocked hook
// has to hand back one stable object, as the real hook does with useCallback.
jest.mock('hooks/useCollectionFolderTree', () => {
  const tree = {
    currentFolders: [],
    breadcrumbs: [],
    selectedFolderUid: null,
    navigateIntoFolder: () => {},
    navigateToRoot: () => {},
    navigateToBreadcrumb: () => {},
    getCurrentParentFolder: () => null,
    getCurrentSelectedFolder: () => null,
    reset: () => {},
    isAtRoot: true
  };
  return () => tree;
});
jest.mock('providers/ReduxStore/slices/collections', () => ({ removeSaveTransientRequestModal: jest.fn() }));
jest.mock('providers/ReduxStore/slices/app', () => ({ insertTaskIntoQueue: jest.fn() }));
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  newFolder: jest.fn(),
  closeTabs: jest.fn(),
  mountCollection: jest.fn(),
  createCollection: jest.fn(),
  browseDirectory: jest.fn()
}));

import SaveTransientRequest from './index';

const SCRATCH_UID = 'scratch-1';

const renderModal = () => {
  const store = configureStore({
    reducer: {
      collections: () => ({ collections: [{ uid: SCRATCH_UID, name: 'scratch', pathname: '/scratch', items: [] }] }),
      workspaces: () => ({
        workspaces: [{ uid: 'ws-1', type: 'default', scratchCollectionUid: SCRATCH_UID, collections: [] }],
        activeWorkspaceUid: 'ws-1'
      }),
      app: () => ({ preferences: { general: { defaultLocation: '/home/user/collections' } } })
    }
  });

  return render(
    <Provider store={store}>
      <ThemeProvider theme={{}}>
        <SaveTransientRequest
          isOpen
          onClose={() => {}}
          item={{ uid: 'req-1', name: 'quick request', type: 'http-request', request: { url: '', method: 'GET' } }}
          collection={{ uid: SCRATCH_UID, name: 'scratch', pathname: '/scratch', items: [] }}
        />
      </ThemeProvider>
    </Provider>
  );
};

describe('SaveTransientRequest focus', () => {
  it('keeps the focus in the request name field while the new collection form is open', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'New collection' }));
    const collectionNameInput = screen.getByPlaceholderText('Enter collection name');
    expect(collectionNameInput).toHaveFocus();

    const requestNameInput = screen.getByTestId('save-transient-request-name');
    requestNameInput.focus();
    fireEvent.change(requestNameInput, { target: { value: 'quick requests' } });

    expect(requestNameInput).toHaveValue('quick requests');
    expect(requestNameInput).toHaveFocus();
  });
});
