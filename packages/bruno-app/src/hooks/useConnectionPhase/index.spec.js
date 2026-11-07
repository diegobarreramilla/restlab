import { renderHook, act } from '@testing-library/react';
import useConnectionPhase, { RESTORED_DURATION_MS, EXIT_DURATION_MS } from './index';

describe('useConnectionPhase', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays hidden while the connection is stable', () => {
    const { result } = renderHook(({ isOnline }) => useConnectionPhase(isOnline), { initialProps: { isOnline: true } });

    act(() => jest.advanceTimersByTime(10000));

    expect(result.current).toBe('hidden');
  });

  it('starts offline when the app opens without a connection', () => {
    const { result } = renderHook(({ isOnline }) => useConnectionPhase(isOnline), { initialProps: { isOnline: false } });

    expect(result.current).toBe('offline');
  });

  it('goes offline, then restored, then leaving, then hidden', () => {
    const { result, rerender } = renderHook(({ isOnline }) => useConnectionPhase(isOnline), { initialProps: { isOnline: true } });

    rerender({ isOnline: false });
    expect(result.current).toBe('offline');

    rerender({ isOnline: true });
    expect(result.current).toBe('restored');

    act(() => jest.advanceTimersByTime(RESTORED_DURATION_MS));
    expect(result.current).toBe('leaving');

    act(() => jest.advanceTimersByTime(EXIT_DURATION_MS));
    expect(result.current).toBe('hidden');
  });

  it('returns to offline if the connection drops again while the notice is leaving', () => {
    const { result, rerender } = renderHook(({ isOnline }) => useConnectionPhase(isOnline), { initialProps: { isOnline: false } });

    rerender({ isOnline: true });
    act(() => jest.advanceTimersByTime(RESTORED_DURATION_MS));
    expect(result.current).toBe('leaving');

    rerender({ isOnline: false });
    expect(result.current).toBe('offline');

    act(() => jest.advanceTimersByTime(10000));
    expect(result.current).toBe('offline');
  });
});
