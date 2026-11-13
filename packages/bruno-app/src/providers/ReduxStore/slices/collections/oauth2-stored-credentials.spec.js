const { describe, it, expect } = require('@jest/globals');
const { configureStore } = require('@reduxjs/toolkit');

jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: () => Promise.resolve() },
  itemSchema: { validate: () => Promise.resolve() }
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

const collectionsReducer = require('providers/ReduxStore/slices/collections').default;
const { loadStoredOauth2Credentials } = require('providers/ReduxStore/slices/collections/actions');

const COLLECTION_UID = 'col-1';
const URL = 'http://localhost:8081/token';

const load = async (stored) => {
  const invoke = jest.fn().mockResolvedValue(stored);
  window.ipcRenderer = { invoke };
  const store = configureStore({
    reducer: { collections: collectionsReducer },
    preloadedState: {
      collections: {
        collectionSortOrder: 'default',
        collections: [{ uid: COLLECTION_UID, pathname: '/c', environments: [], collapsed: false, items: [] }],
        tempDirectories: {}
      }
    }
  });

  const result = await store.dispatch(loadStoredOauth2Credentials({ collectionUid: COLLECTION_UID, url: URL, credentialsId: 'credentials' }));
  return { invoke, result, collection: store.getState().collections.collections[0] };
};

describe('loadStoredOauth2Credentials', () => {
  it('asks the main process for the credentials saved under that key', async () => {
    const { invoke } = await load(null);

    expect(invoke).toHaveBeenCalledWith('renderer:get-stored-oauth2-credentials', {
      collectionUid: COLLECTION_UID,
      url: URL,
      credentialsId: 'credentials'
    });
  });

  it('puts a saved token into the collection state without adding a timeline entry', async () => {
    const { collection } = await load({ access_token: 'abc' });

    expect(collection.oauth2Credentials).toHaveLength(1);
    expect(collection.oauth2Credentials[0]).toMatchObject({ url: URL, credentialsId: 'credentials', credentials: { access_token: 'abc' } });
    expect(collection.timeline ?? []).toHaveLength(0);
  });

  it('leaves the state alone when nothing is saved', async () => {
    const { result, collection } = await load(null);

    expect(result).toBeNull();
    expect(collection.oauth2Credentials).toBeUndefined();
  });
});
