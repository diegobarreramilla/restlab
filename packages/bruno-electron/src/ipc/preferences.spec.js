jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  nativeTheme: {},
  app: { getPath: jest.fn(() => '/home/u/.config/restlab') }
}));

jest.mock('../store/preferences', () => ({ getPreferences: jest.fn(), savePreferences: jest.fn() }));
jest.mock('../utils/git', () => ({ getGitVersion: jest.fn() }));
jest.mock('../store/global-environments', () => ({ globalEnvironmentsStore: {} }));
jest.mock('../store/system-proxy', () => ({ getCachedSystemProxy: jest.fn(), fetchSystemProxy: jest.fn() }));
jest.mock('../utils/default-location', () => ({ resolveDefaultLocation: jest.fn() }));
jest.mock('../app/onboarding', () => jest.fn(() => Promise.resolve()));
jest.mock('../store/last-opened-collections', () => jest.fn());
jest.mock('../store/window-state', () => jest.fn());
jest.mock('@usebruno/requests', () => ({ clearAgentCache: jest.fn(), clearPacCache: jest.fn() }));
jest.mock('../app/mock-server/mock-server', () => ({ isMockServerEnabled: jest.fn(), stopAll: jest.fn() }));

const { app, ipcMain } = require('electron');
const registerPreferencesIpc = require('./preferences');
const { getUserDataPath } = require('./preferences');

describe('getUserDataPath', () => {
  it('returns the userData path from the app', () => {
    expect(getUserDataPath()).toBe('/home/u/.config/restlab');
    expect(app.getPath).toHaveBeenCalledWith('userData');
  });
});

describe('registerPreferencesIpc — get-user-data-path', () => {
  it('registers a renderer:get-user-data-path handler that answers the userData path', async () => {
    registerPreferencesIpc({ webContents: { send: jest.fn() } });

    expect(ipcMain.handle).toHaveBeenCalledWith('renderer:get-user-data-path', expect.any(Function));

    const callback = ipcMain.handle.mock.calls
      .find(([channel]) => channel === 'renderer:get-user-data-path')[1];

    await expect(callback()).resolves.toBe('/home/u/.config/restlab');
  });
});
