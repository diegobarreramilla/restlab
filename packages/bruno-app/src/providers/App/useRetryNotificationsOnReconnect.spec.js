import { renderHook } from '@testing-library/react';
import useRetryNotificationsOnReconnect from './useRetryNotificationsOnReconnect';

describe('useRetryNotificationsOnReconnect', () => {
  let send;

  beforeEach(() => {
    send = jest.fn();
    window.ipcRenderer = { send };
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('asks the main process for notifications when the connection returns', () => {
    renderHook(() => useRetryNotificationsOnReconnect());

    window.dispatchEvent(new Event('online'));

    expect(send).toHaveBeenCalledWith('renderer:notifications-opened');
  });

  it('does nothing when the connection drops', () => {
    renderHook(() => useRetryNotificationsOnReconnect());

    window.dispatchEvent(new Event('offline'));

    expect(send).not.toHaveBeenCalled();
  });

  it('stops listening once unmounted', () => {
    const { unmount } = renderHook(() => useRetryNotificationsOnReconnect());
    unmount();

    window.dispatchEvent(new Event('online'));

    expect(send).not.toHaveBeenCalled();
  });
});
