import { renderHook, act } from '@testing-library/react';
import useRetryNotificationsOnReconnect from './useRetryNotificationsOnReconnect';

const setOnline = (value) => {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
  act(() => {
    window.dispatchEvent(new Event(value ? 'online' : 'offline'));
  });
};

describe('useRetryNotificationsOnReconnect', () => {
  let send;

  beforeEach(() => {
    send = jest.fn();
    window.ipcRenderer = { send, invoke: jest.fn().mockResolvedValue(null) };
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('asks the main process for notifications when the connection returns', () => {
    renderHook(() => useRetryNotificationsOnReconnect());

    setOnline(false);
    expect(send).not.toHaveBeenCalled();

    setOnline(true);
    expect(send).toHaveBeenCalledWith('renderer:notifications-opened');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('does nothing on startup while the connection is stable', () => {
    renderHook(() => useRetryNotificationsOnReconnect());

    expect(send).not.toHaveBeenCalled();
  });

  it('stops reacting once unmounted', () => {
    const { unmount } = renderHook(() => useRetryNotificationsOnReconnect());
    setOnline(false);
    unmount();

    setOnline(true);

    expect(send).not.toHaveBeenCalled();
  });
});
