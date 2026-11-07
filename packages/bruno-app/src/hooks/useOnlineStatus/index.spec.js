import { renderHook, waitFor, act } from '@testing-library/react';
import useOnlineStatus from './index';

const setBrowserOnline = (value) => {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
};

describe('useOnlineStatus', () => {
  afterEach(() => {
    delete window.ipcRenderer;
    setBrowserOnline(true);
  });

  it('follows the browser flag when the main process cannot tell', async () => {
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue(null) };
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);

    setBrowserOnline(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);
  });

  it('reports offline when the browser says online but the system has no default route', async () => {
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue(false) };
    const { result } = renderHook(() => useOnlineStatus());

    await waitFor(() => expect(result.current).toBe(false));
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:get-has-default-route');
  });

  it('reports online when both the browser and the system agree', async () => {
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue(true) };
    const { result } = renderHook(() => useOnlineStatus());

    await waitFor(() => expect(window.ipcRenderer.invoke).toHaveBeenCalled());
    expect(result.current).toBe(true);
  });

  it('works without the IPC bridge', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);
  });
});
