jest.mock('electron', () => ({
  ipcMain: { on: jest.fn() }
}));
jest.mock('node-fetch', () => jest.fn());
jest.mock('../store/preferences', () => ({
  preferencesUtil: { shouldFetchNotifications: jest.fn() }
}));

const fetch = require('node-fetch');
const { preferencesUtil } = require('../store/preferences');
const { pushNotifications } = require('./notifications');

describe('pushNotifications', () => {
  let mainWindow;

  beforeEach(() => {
    jest.clearAllMocks();
    mainWindow = { webContents: { send: jest.fn() } };
  });

  it('sends no network request when fetching notifications is off', async () => {
    preferencesUtil.shouldFetchNotifications.mockReturnValue(false);

    await pushNotifications(mainWindow);

    expect(fetch).not.toHaveBeenCalled();
    expect(mainWindow.webContents.send).not.toHaveBeenCalled();
  });

  it('fetches and forwards notifications when the user has opted in', async () => {
    preferencesUtil.shouldFetchNotifications.mockReturnValue(true);
    fetch.mockResolvedValue({ json: async () => ({ notifications: [{ id: 1 }] }) });

    await pushNotifications(mainWindow);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('main:load-notifications', [{ id: 1 }]);
  });

  it('does not throw when the server is unreachable', async () => {
    preferencesUtil.shouldFetchNotifications.mockReturnValue(true);
    fetch.mockRejectedValue(new Error('offline'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(pushNotifications(mainWindow)).resolves.toBeUndefined();
    expect(mainWindow.webContents.send).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
