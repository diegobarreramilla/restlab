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
const mockCreateCollection = jest.fn();
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  newFolder: jest.fn(),
  closeTabs: jest.fn(),
  mountCollection: jest.fn(),
  createCollection: (...args) => mockCreateCollection(...args),
  browseDirectory: jest.fn()
}));

import SaveTransientRequest from './index';

const SCRATCH_UID = 'scratch-1';
const SCRATCH = { uid: SCRATCH_UID, name: 'scratch', pathname: '/scratch', items: [] };

const renderModal = ({ workspaceCollections = () => [], extraCollections = () => [] } = {}) => {
  const store = configureStore({
    reducer: {
      collections: () => ({ collections: [SCRATCH, ...extraCollections()] }),
      workspaces: () => ({
        workspaces: [{ uid: 'ws-1', type: 'default', scratchCollectionUid: SCRATCH_UID, collections: workspaceCollections() }],
        activeWorkspaceUid: 'ws-1'
      }),
      app: () => ({ preferences: { general: { defaultLocation: '/home/user/collections' } } })
    }
  });

  const utils = render(
    <Provider store={store}>
      <ThemeProvider theme={{}}>
        <SaveTransientRequest
          isOpen
          onClose={() => {}}
          item={{ uid: 'req-1', name: 'quick request', type: 'http-request', request: { url: '', method: 'GET' } }}
          collection={SCRATCH}
        />
      </ThemeProvider>
    </Provider>
  );
  return utils;
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

describe('SaveTransientRequest new collection', () => {
  it('selects the collection it just created so the request is saved into it', async () => {
    let created = false;
    // The real flow adds the collection to the workspace when the main process reports it opened.
    mockCreateCollection.mockImplementation(() => (dispatch) => {
      created = true;
      dispatch({ type: 'collection-opened' });
      return Promise.resolve();
    });

    renderModal({
      workspaceCollections: () => (created ? [{ name: 'fresh', path: '/home/user/collections/fresh' }] : []),
      extraCollections: () => (created
        ? [{ uid: 'fresh-uid', name: 'fresh', pathname: '/home/user/collections/fresh', mountStatus: 'mounted', items: [] }]
        : [])
    });

    fireEvent.click(screen.getByRole('button', { name: 'New collection' }));
    fireEvent.change(screen.getByPlaceholderText('Enter collection name'), { target: { value: 'fresh' } });
    expect(screen.getByText('Select a collection to save to')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Save to Collections')).toBeInTheDocument();
    expect(screen.queryByText('Select a collection to save to')).not.toBeInTheDocument();
    expect(mockCreateCollection).toHaveBeenCalledTimes(1);
  });
});
