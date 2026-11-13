const { describe, it, expect } = require('@jest/globals');
const { configureStore } = require('@reduxjs/toolkit');

jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: (value) => Promise.resolve(value) },
  itemSchema: { validate: () => Promise.resolve() }
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

const collectionsReducer = require('providers/ReduxStore/slices/collections').default;
const { markEnvironmentVariablesAsSecret } = require('providers/ReduxStore/slices/collections/actions');

const COLLECTION_UID = 'col-1';

const setup = ({ draft = null } = {}) => {
  const invoke = jest.fn().mockResolvedValue(null);
  window.ipcRenderer = { invoke };
  const store = configureStore({
    reducer: { collections: collectionsReducer },
    preloadedState: {
      collections: {
        collectionSortOrder: 'default',
        collections: [{
          uid: COLLECTION_UID,
          pathname: '/c',
          environments: [{
            uid: 'env-1',
            name: 'dev',
            variables: [
              { uid: 'v1', name: 'password', value: 'hunter2hunter2', secret: false, enabled: true },
              { uid: 'v2', name: 'baseUrl', value: 'http://localhost', secret: false, enabled: true }
            ]
          }],
          environmentsDraft: draft,
          collapsed: false,
          items: []
        }],
        tempDirectories: {}
      }
    }
  });
  return { invoke, store };
};

const savedVariables = (store) => store.getState().collections.collections[0].environments[0].variables;

describe('markEnvironmentVariablesAsSecret', () => {
  it('marks only the named variables and saves the environment', async () => {
    const { invoke, store } = setup();

    await store.dispatch(markEnvironmentVariablesAsSecret({ collectionUid: COLLECTION_UID, environmentUid: 'env-1', names: ['password'] }));

    expect(savedVariables(store).map((v) => [v.name, v.secret])).toEqual([['password', true], ['baseUrl', false]]);
    const [, , environment] = invoke.mock.calls.find(([channel]) => channel === 'renderer:save-environment');
    expect(environment.variables.find((v) => v.name === 'password').secret).toBe(true);
  });

  it('refuses while the environment has unsaved edits and writes nothing', async () => {
    const { invoke, store } = setup({ draft: { environmentUid: 'env-1', variables: [] } });

    await expect(
      store.dispatch(markEnvironmentVariablesAsSecret({ collectionUid: COLLECTION_UID, environmentUid: 'env-1', names: ['password'] }))
    ).rejects.toThrow('unsaved changes');

    expect(invoke).not.toHaveBeenCalled();
    expect(savedVariables(store)[0].secret).toBe(false);
  });

  it('rejects an environment that does not exist', async () => {
    const { store } = setup();

    await expect(
      store.dispatch(markEnvironmentVariablesAsSecret({ collectionUid: COLLECTION_UID, environmentUid: 'nope', names: ['password'] }))
    ).rejects.toThrow('Environment not found');
  });
});
