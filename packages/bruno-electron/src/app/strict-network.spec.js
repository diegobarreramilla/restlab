jest.mock('electron', () => ({ ipcMain: { handle: jest.fn() }, session: {} }));
jest.mock('../store/preferences', () => ({ preferencesUtil: { isStrictNetworkEnabled: jest.fn() } }));
jest.mock('./app-documents', () => ({ APP_PARTITION: 'bruno-app-view' }));

const { staysOnThisMachine, createBlockedLog, decide } = require('./strict-network');

describe('strict network mode', () => {
  it.each([
    ['http://localhost:3000/index.html'],
    ['ws://localhost:3000/hmr'],
    ['http://127.0.0.1:47831/oauth2/callback'],
    ['http://[::1]:8080/'],
    ['http://api.localhost/'],
    ['file:///opt/RestLab/resources/app/index.html'],
    ['devtools://devtools/bundled/inspector.html'],
    ['data:image/png;base64,AAAA'],
    ['blob:http://localhost:3000/1b2c'],
    ['bruno-app://abc/index.html'],
    ['about:blank']
  ])('lets %s through', (url) => {
    expect(staysOnThisMachine(url)).toBe(true);
  });

  it.each([
    ['https://example.com/pixel.png'],
    ['http://192.168.1.20/'],
    ['wss://stream.example.com/'],
    ['https://localhost.example.com/'],
    ['https://127.0.0.1.example.com/'],
    ['http://10.0.0.1/'],
    ['ftp://files.example.com/a'],
    ['not a url']
  ])('stops %s', (url) => {
    expect(staysOnThisMachine(url)).toBe(false);
  });

  it('cancels and counts a request that leaves the machine only while the mode is on', () => {
    const log = createBlockedLog();
    let enabled = false;
    const isEnabled = () => enabled;

    expect(decide({ url: 'https://example.com/a.png', isEnabled, log })).toEqual({ cancel: false });
    expect(log.snapshot().blockedCount).toBe(0);

    enabled = true;
    expect(decide({ url: 'https://example.com/a.png', isEnabled, log })).toEqual({ cancel: true });
    expect(decide({ url: 'https://example.com/b.png', isEnabled, log })).toEqual({ cancel: true });
    expect(decide({ url: 'http://localhost:3000/', isEnabled, log })).toEqual({ cancel: false });

    expect(log.snapshot()).toEqual({ blockedCount: 2, blockedHosts: [{ host: 'example.com', attempts: 2 }] });
  });

  it('keeps counting but stops remembering new hosts after twenty', () => {
    const log = createBlockedLog();
    for (let i = 0; i < 25; i++) log.record(`https://host-${i}.example.com/`);

    expect(log.snapshot().blockedCount).toBe(25);
    expect(log.snapshot().blockedHosts).toHaveLength(20);
  });
});
