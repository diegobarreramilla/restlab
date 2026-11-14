import { configureStore } from '@reduxjs/toolkit';

jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const { createUnsavedDraftsMiddleware } = require('./middleware');
const collectionsReducer = require('../../slices/collections').default;
const { requestUrlChanged, deleteRequestDraft } = require('../../slices/collections');

const REQUEST_PATH = '/work/api/users.yml';

const savedRequest = (url) => ({ method: 'GET', url, params: [], headers: [], body: { mode: 'none' } });

const buildStore = ({ kept = {}, url = 'https://a.test' } = {}) => {
  const ipc = {
    invoke: jest.fn((channel) => Promise.resolve(channel === 'renderer:unsaved-drafts:get' ? kept : undefined))
  };
  const notify = jest.fn();
  const item = { uid: 'req-1', name: 'users', type: 'http-request', pathname: REQUEST_PATH, request: savedRequest(url) };
  const store = configureStore({
    reducer: { collections: collectionsReducer },
    preloadedState: { collections: { ...collectionsReducer(undefined, { type: '@@init' }), collections: [{ uid: 'col-1', pathname: '/work/api', items: [item] }] } },
    middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false }).concat(createUnsavedDraftsMiddleware({ ipc, notify }))
  });
  const saves = () => ipc.invoke.mock.calls.filter(([channel]) => channel === 'renderer:unsaved-drafts:save').map(([, drafts]) => drafts);
  const draftUrl = () => store.getState().collections.collections[0].items[0].draft?.request.url;
  return { store, ipc, notify, saves, draftUrl };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const edit = (url) => requestUrlChanged({ collectionUid: 'col-1', itemUid: 'req-1', url });

describe('unsaved drafts middleware', () => {
  it('writes an edit to disk shortly after it is made, and only once for a burst of edits', async () => {
    const { store, saves } = buildStore();
    await settle();

    store.dispatch(edit('https://a.test/1'));
    store.dispatch(edit('https://a.test/12'));
    expect(saves()).toHaveLength(0);

    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(saves()).toHaveLength(1);
    expect(saves()[0][REQUEST_PATH].draft.request.url).toBe('https://a.test/12');
  });

  it('forgets a draft at once when it is discarded', async () => {
    const { store, saves } = buildStore();
    await settle();
    store.dispatch(edit('https://a.test/1'));
    await new Promise((resolve) => setTimeout(resolve, 1100));

    store.dispatch(deleteRequestDraft({ collectionUid: 'col-1', itemUid: 'req-1' }));

    expect(saves()[saves().length - 1]).toEqual({});
  });

  it('puts back the draft kept from the previous run and says so once', async () => {
    const kept = { [REQUEST_PATH]: { base: savedRequest('https://a.test'), draft: { request: savedRequest('https://a.test/kept') } } };
    const { notify, draftUrl } = buildStore({ kept });
    await settle();

    expect(draftUrl()).toBe('https://a.test/kept');
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith('Recovered the unsaved changes of 1 request');
  });

  it('drops a kept draft whose file changed, without a word', async () => {
    const kept = { [REQUEST_PATH]: { base: savedRequest('https://a.test'), draft: { request: savedRequest('https://a.test/kept') } } };
    const { notify, draftUrl } = buildStore({ kept, url: 'https://changed.test' });
    await settle();

    expect(draftUrl()).toBeUndefined();
    expect(notify).not.toHaveBeenCalled();
  });
});
