const { describe, it, expect } = require('@jest/globals');
const { configureStore } = require('@reduxjs/toolkit');

jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: (value) => Promise.resolve(value) },
  itemSchema: { validate: (value) => Promise.resolve(value) }
}));

jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
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

describe('moveRequestValueToSecretVariable', () => {
  const { moveRequestValueToSecretVariable } = require('providers/ReduxStore/slices/collections/actions');

  const ITEM_UID = 'req-1';
  const build = ({ activeEnvironmentUid = 'env-1', itemDraft = null, existing = [], environmentsDraft = null } = {}) => {
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
            format: 'yml',
            activeEnvironmentUid,
            environmentsDraft,
            environments: [{ uid: 'env-1', name: 'dev', variables: existing }],
            collapsed: false,
            items: [{
              uid: ITEM_UID,
              type: 'http-request',
              name: 'list',
              pathname: '/c/list.yml',
              draft: itemDraft,
              request: {
                method: 'GET',
                url: 'https://api.example.com',
                headers: [{ uid: 'h1', name: 'Authorization', value: 'Bearer abc123def456', enabled: true }],
                params: [],
                body: { mode: 'none' },
                auth: { mode: 'bearer', bearer: { token: 'tok_4567890123' } },
                vars: {},
                assertions: [],
                tests: '',
                docs: ''
              }
            }],
            tempDirectories: {}
          }],
          tempDirectories: {}
        }
      }
    });
    return { invoke, store };
  };
  const move = (store, source) => store.dispatch(moveRequestValueToSecretVariable({ collectionUid: COLLECTION_UID, itemUid: ITEM_UID, source }));
  const savedRequest = (invoke) => invoke.mock.calls.find(([channel]) => channel === 'renderer:save-request')[2];
  const savedEnvironment = (invoke) => invoke.mock.calls.find(([channel]) => channel === 'renderer:save-environment')[2];

  it('stores the value as a secret variable and leaves the variable in its place, keeping the scheme', async () => {
    const { invoke, store } = build();

    const name = await move(store, { section: 'headers', name: 'Authorization' });

    expect(name).toBe('authorizationToken');
    expect(savedEnvironment(invoke).variables).toEqual([expect.objectContaining({ name: 'authorizationToken', value: 'abc123def456', secret: true, enabled: true })]);
    expect(savedRequest(invoke).request.headers[0].value).toBe('Bearer {{authorizationToken}}');
  });

  it('rewrites an auth field the same way', async () => {
    const { invoke, store } = build();

    await move(store, { section: 'auth', name: 'bearer.token' });

    expect(savedRequest(invoke).request.auth.bearer.token).toBe('{{bearerToken}}');
  });

  it('reuses a secret variable that already holds the same value instead of adding another', async () => {
    const { invoke, store } = build({ existing: [{ uid: 'v1', name: 'myToken', value: 'abc123def456', secret: true, enabled: true, type: 'text' }] });

    const name = await move(store, { section: 'headers', name: 'Authorization' });

    expect(name).toBe('myToken');
    expect(invoke.mock.calls.find(([channel]) => channel === 'renderer:save-environment')).toBeUndefined();
    expect(savedRequest(invoke).request.headers[0].value).toBe('Bearer {{myToken}}');
  });

  it('does not reuse a variable that holds the same text without being secret', async () => {
    const { invoke, store } = build({ existing: [{ uid: 'v1', name: 'plainToken', value: 'abc123def456', secret: false, enabled: true, type: 'text' }] });

    const name = await move(store, { section: 'headers', name: 'Authorization' });

    expect(name).toBe('authorizationToken');
    expect(savedEnvironment(invoke).variables).toHaveLength(2);
  });

  it.each([
    ['there is no active environment', { activeEnvironmentUid: null }, 'Select an environment'],
    ['the request has unsaved changes', { itemDraft: { request: {} } }, 'unsaved changes in this request'],
    ['the environment has unsaved changes', { environmentsDraft: { environmentUid: 'env-1', variables: [] } }, 'unsaved changes in the environment']
  ])('refuses and writes nothing when %s', async (_label, options, message) => {
    const { invoke, store } = build(options);

    await expect(move(store, { section: 'headers', name: 'Authorization' })).rejects.toThrow(message);

    expect(invoke).not.toHaveBeenCalled();
  });

  it('refuses when the value is no longer in the request', async () => {
    const { invoke, store } = build();

    await expect(move(store, { section: 'headers', name: 'X-Gone' })).rejects.toThrow('not in the request any more');

    expect(invoke).not.toHaveBeenCalled();
  });
});
