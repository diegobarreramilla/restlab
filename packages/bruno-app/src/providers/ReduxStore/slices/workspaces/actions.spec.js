jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: () => Promise.resolve() },
  itemSchema: { validate: () => Promise.resolve() }
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

jest.mock('../collections/actions', () => {
  const { createCollection } = jest.requireActual('../collections');
  return {
    createCollection: jest.fn(() => () => Promise.resolve()),
    openMultipleCollections: jest.fn(() => () => Promise.resolve({ opened: [], failed: [], invalid: [] })),
    // The real thunk dispatches _createCollection; mirror that so a mounted scratch
    // collection actually lands in the store for the createScratchRequest tests.
    openScratchCollectionEvent: jest.fn((uid, pathname, brunoConfig) => (dispatch) => {
      dispatch(createCollection({ uid, pathname, name: brunoConfig?.name || 'Scratch', items: [], brunoConfig }));
      return Promise.resolve();
    }),
    mountCollection: jest.fn(() => () => Promise.resolve()),
    hydrateCollectionWithUiStateSnapshot: jest.fn(() => () => Promise.resolve()),
    newHttpRequest: jest.fn(() => () => Promise.resolve())
  };
});

import os from 'os';
import path from 'path';
import { configureStore } from '@reduxjs/toolkit';
import workspacesReducer, { updateWorkspace } from './index';
import collectionsReducer from '../collections';
import chatReducer, { openAiSidebar } from '../chat';
import appReducer from '../app';
import tabsReducer from '../tabs';
import globalEnvironmentsReducer from '../global-environments';

const WS_A = 'workspace-a';
const WS_B = 'workspace-b';
const SCRATCH_A = 'scratch-a';
const SCRATCH_B = 'scratch-b';

const makeScratchCollection = (uid) => ({
  uid,
  pathname: path.join(os.tmpdir(), uid),
  name: 'Scratch',
  items: [],
  brunoConfig: { version: '1', name: 'Scratch', type: 'collection' },
  mountStatus: 'mounted'
});

const makeWorkspace = (uid, scratchUid) => ({
  uid,
  name: uid,
  pathname: null,
  collections: [],
  scratchCollectionUid: scratchUid
});

const mockIpcInvoke = (channel) => {
  if (channel === 'renderer:snapshot:get') {
    return Promise.resolve(null);
  }
  if (channel === 'renderer:get-global-environments') {
    return Promise.resolve({ globalEnvironments: [], activeGlobalEnvironmentUid: null });
  }
  return Promise.resolve(null);
};

const createStore = ({ activeWorkspaceUid = WS_A, collections } = {}) => {
  const preloadedState = {
    workspaces: {
      activeWorkspaceUid,
      workspaces: [makeWorkspace(WS_A, SCRATCH_A), makeWorkspace(WS_B, SCRATCH_B)]
    },
    collections: {
      collections: collections || [makeScratchCollection(SCRATCH_A), makeScratchCollection(SCRATCH_B)],
      collectionSortOrder: 'default',
      activeConnections: [],
      tempDirectories: {},
      saveTransientRequestModals: []
    },
    chat: { isOpen: false, chats: {} },
    app: {
      snapshotReady: true,
      snapshotHydration: {
        workspaceUid: null,
        pendingCollectionPathnames: [],
        activeCollectionPathname: null,
        startedAt: null
      },
      preferences: { cache: { file: { enabled: false } } }
    },
    tabs: { tabs: [], activeTabUid: null, recentlyClosedTabs: [] },
    globalEnvironments: {
      globalEnvironments: [],
      activeGlobalEnvironmentUid: null,
      globalEnvironmentDraft: null,
      _scriptGlobalEnvBaseline: null
    }
  };

  return configureStore({
    reducer: {
      workspaces: workspacesReducer,
      collections: collectionsReducer,
      chat: chatReducer,
      app: appReducer,
      tabs: tabsReducer,
      globalEnvironments: globalEnvironmentsReducer
    },
    preloadedState
  });
};

describe('switchWorkspace', () => {
  let switchWorkspace;

  beforeAll(async () => {
    window.ipcRenderer = { invoke: jest.fn(mockIpcInvoke) };
    ({ switchWorkspace } = await import('./actions'));
  });

  it('closes the AI sidebar when switching workspaces', async () => {
    const store = createStore();
    store.dispatch(openAiSidebar());
    expect(store.getState().chat.isOpen).toBe(true);

    await store.dispatch(switchWorkspace(WS_B));

    expect(store.getState().chat.isOpen).toBe(false);
    expect(store.getState().workspaces.activeWorkspaceUid).toBe(WS_B);
  });
});

describe('collections that fail to open on workspace switch', () => {
  let switchWorkspace;
  let toast;
  let openMultipleCollections;

  const WS_B_PATH = path.join(os.tmpdir(), 'ws-b');
  const HEALTHY_COLL = path.join(os.tmpdir(), 'healthy-coll');
  const MISSING_COLL = path.join(os.tmpdir(), 'missing-coll');
  const EMPTY_COLL = path.join(os.tmpdir(), 'empty-coll');
  const BROKEN_COLL = path.join(os.tmpdir(), 'broken-coll');

  let workspaceCollections;
  let unopenableCollections;
  let openResult;

  beforeAll(async () => {
    ({ default: toast } = await import('react-hot-toast'));
    ({ openMultipleCollections } = await import('../collections/actions'));
    ({ switchWorkspace } = await import('./actions'));
  });

  beforeEach(() => {
    toast.error.mockClear();
    openMultipleCollections.mockClear();

    workspaceCollections = [{ name: 'Healthy', path: HEALTHY_COLL }];
    unopenableCollections = [];
    openResult = { opened: [HEALTHY_COLL], failed: [], invalid: [] };

    openMultipleCollections.mockImplementation(() => () => Promise.resolve(openResult));

    // actions.js captures `const { ipcRenderer } = window` at import time, so mutate
    // the existing object's `invoke` rather than reassigning window.ipcRenderer.
    window.ipcRenderer.invoke = jest.fn((channel) => {
      if (channel === 'renderer:load-workspace-collections') {
        return Promise.resolve(workspaceCollections);
      }
      if (channel === 'renderer:load-unopenable-workspace-collections') {
        return Promise.resolve(unopenableCollections);
      }
      return mockIpcInvoke(channel);
    });
  });

  const switchToWorkspaceB = async () => {
    const store = createStore();
    store.dispatch(updateWorkspace({ uid: WS_B, pathname: WS_B_PATH }));
    await store.dispatch(switchWorkspace(WS_B));
    return store;
  };

  it('does not notify when every collection opens', async () => {
    await switchToWorkspaceB();

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('suppresses the per-collection errors from main so the aggregate toast is the only notification', async () => {
    await switchToWorkspaceB();

    expect(openMultipleCollections).toHaveBeenCalledWith(
      [HEALTHY_COLL],
      { workspacePath: WS_B_PATH, dontSendDisplayErrors: true }
    );
  });

  it('notifies about entries that the workspace config could not resolve', async () => {
    unopenableCollections = [
      { name: 'Missing', path: MISSING_COLL },
      { name: 'Empty', path: EMPTY_COLL }
    ];

    await switchToWorkspaceB();

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Failed to open 2 collections');
  });

  it('uses the singular form for a single failure', async () => {
    unopenableCollections = [{ name: 'Missing', path: MISSING_COLL }];

    await switchToWorkspaceB();

    expect(toast.error).toHaveBeenCalledWith('Failed to open 1 collection');
  });

  it('notifies when a resolvable collection fails to open at runtime', async () => {
    workspaceCollections = [{ name: 'Broken', path: BROKEN_COLL }];
    openResult = { opened: [], failed: [{ path: BROKEN_COLL, error: 'boom' }], invalid: [] };

    await switchToWorkspaceB();

    expect(toast.error).toHaveBeenCalledWith('Failed to open 1 collection');
  });

  it('counts a collection once when both the config and the open attempt report it', async () => {
    workspaceCollections = [{ name: 'Broken', path: BROKEN_COLL }];
    unopenableCollections = [{ name: 'Broken', path: BROKEN_COLL }];
    openResult = { opened: [], failed: [{ path: BROKEN_COLL, error: 'boom' }], invalid: [] };

    await switchToWorkspaceB();

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Failed to open 1 collection');
  });

  it('notifies when every collection in the workspace is unresolvable', async () => {
    workspaceCollections = [];
    unopenableCollections = [
      { name: 'Missing', path: MISSING_COLL },
      { name: 'Empty', path: EMPTY_COLL }
    ];

    await switchToWorkspaceB();

    expect(openMultipleCollections).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Failed to open 2 collections');
  });
});

describe('createScratchRequest', () => {
  let createScratchRequest;
  let newHttpRequest;
  let toast;
  let generateUidBasedOnHash;

  beforeAll(async () => {
    window.ipcRenderer = window.ipcRenderer || { invoke: jest.fn(mockIpcInvoke) };
    ({ createScratchRequest } = await import('./actions'));
    ({ newHttpRequest } = await import('../collections/actions'));
    ({ default: toast } = await import('react-hot-toast'));
    ({ generateUidBasedOnHash } = await import('utils/common'));
  });

  beforeEach(() => {
    newHttpRequest.mockClear();
    toast.error.mockClear();
    window.ipcRenderer.invoke = jest.fn(mockIpcInvoke);
  });

  it('creates a transient HTTP request in the workspace scratch collection', async () => {
    const store = createStore();

    const result = await store.dispatch(createScratchRequest());

    expect(newHttpRequest).toHaveBeenCalledWith({
      requestName: 'Untitled 1',
      filename: 'Untitled 1',
      requestType: 'http-request',
      requestUrl: '',
      requestMethod: 'GET',
      collectionUid: SCRATCH_A,
      itemUid: null,
      isTransient: true
    });
    expect(result).toEqual({ collectionUid: SCRATCH_A, requestName: 'Untitled 1' });
  });

  it('continues the Untitled series of transient requests in the scratch collection', async () => {
    const store = createStore({
      collections: [
        {
          ...makeScratchCollection(SCRATCH_A),
          items: [
            { uid: 'r1', type: 'http-request', name: 'Untitled 1', isTransient: true, request: {} },
            { uid: 'r2', type: 'http-request', name: 'Saved request', isTransient: false, request: {} },
            { uid: 'r3', type: 'http-request', name: 'Untitled 3', isTransient: true, request: {} }
          ]
        },
        makeScratchCollection(SCRATCH_B)
      ]
    });

    const result = await store.dispatch(createScratchRequest());

    expect(newHttpRequest).toHaveBeenCalledWith(expect.objectContaining({ requestName: 'Untitled 4' }));
    expect(result).toEqual({ collectionUid: SCRATCH_A, requestName: 'Untitled 4' });
  });

  it('mounts the scratch collection first when the workspace has none yet', async () => {
    const tempDirectoryPath = path.join(os.tmpdir(), 'scratch-new');
    // actions.js captures `ipcRenderer` from window at import time: mutate invoke on the
    // existing object instead of replacing window.ipcRenderer.
    window.ipcRenderer.invoke = jest.fn((channel) => {
      if (channel === 'renderer:mount-workspace-scratch') {
        return Promise.resolve(tempDirectoryPath);
      }
      return mockIpcInvoke(channel);
    });
    const store = createStore({ collections: [makeScratchCollection(SCRATCH_B)] });

    const result = await store.dispatch(createScratchRequest());
    const expectedUid = generateUidBasedOnHash(tempDirectoryPath);

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:mount-workspace-scratch', expect.anything());
    expect(newHttpRequest).toHaveBeenCalledWith(expect.objectContaining({ collectionUid: expectedUid }));
    expect(result).toEqual({ collectionUid: expectedUid, requestName: 'Untitled 1' });
  });

  it('notifies and does nothing when there is no active workspace', async () => {
    const store = createStore({ activeWorkspaceUid: 'missing' });

    const result = await store.dispatch(createScratchRequest());

    expect(result).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('Unable to create a quick request');
    expect(newHttpRequest).not.toHaveBeenCalled();
  });
});
