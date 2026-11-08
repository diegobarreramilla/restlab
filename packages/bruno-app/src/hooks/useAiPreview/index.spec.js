import { renderHook, act } from '@testing-library/react';
import useAiPreview from './index';

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useAiPreview', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useAiPreview(jest.fn()));

    expect(result.current.state).toBeNull();
  });

  it('shows a loading state, then the preview, passing the argument to the fetcher', async () => {
    const fetchPreview = jest.fn().mockResolvedValue({ sections: [], totals: {} });
    const { result } = renderHook(() => useAiPreview(fetchPreview));

    let pending;
    act(() => {
      pending = result.current.open('look', 'my message');
    });
    expect(result.current.state).toMatchObject({ mode: 'look', arg: 'my message', status: 'loading', preview: null });

    await act(async () => {
      await pending;
    });
    expect(fetchPreview).toHaveBeenCalledWith('my message');
    expect(result.current.state).toMatchObject({ status: 'ready', preview: { sections: [], totals: {} }, error: null });
  });

  it('surfaces an error returned by the main process', async () => {
    const fetchPreview = jest.fn().mockResolvedValue({ error: 'AI features are disabled.' });
    const { result } = renderHook(() => useAiPreview(fetchPreview));

    await act(async () => {
      await result.current.open('review', 'x');
    });

    expect(result.current.state).toMatchObject({ mode: 'review', status: 'error', error: 'AI features are disabled.', preview: null });
  });

  it('surfaces a failure of the call itself', async () => {
    const fetchPreview = jest.fn().mockRejectedValue(new Error('IPC is down'));
    const { result } = renderHook(() => useAiPreview(fetchPreview));

    await act(async () => {
      await result.current.open('look', 'x');
    });

    expect(result.current.state).toMatchObject({ status: 'error', error: 'IPC is down' });
  });

  it('keeps the last preview on screen while a refresh is under way', async () => {
    const first = { sections: [{ id: 'a' }], totals: {} };
    const slow = deferred();
    const fetchPreview = jest.fn().mockResolvedValueOnce(first).mockReturnValueOnce(slow.promise);
    const { result } = renderHook(() => useAiPreview(fetchPreview));

    await act(async () => {
      await result.current.open('look', 'one');
    });

    let pending;
    act(() => {
      pending = result.current.open('look', 'two');
    });
    expect(result.current.state).toMatchObject({ status: 'loading', preview: first });

    await act(async () => {
      slow.resolve({ sections: [{ id: 'b' }], totals: {} });
      await pending;
    });
    expect(result.current.state.preview.sections[0].id).toBe('b');
  });

  it('ignores a slow answer that a newer request has already replaced', async () => {
    const slow = deferred();
    const fast = deferred();
    const fetchPreview = jest.fn().mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise);
    const { result } = renderHook(() => useAiPreview(fetchPreview));

    let older;
    let newer;
    act(() => {
      older = result.current.open('look', 'old');
      newer = result.current.open('look', 'new');
    });

    await act(async () => {
      fast.resolve({ sections: [{ id: 'new' }], totals: {} });
      await newer;
      slow.resolve({ sections: [{ id: 'old' }], totals: {} });
      await older;
    });

    expect(result.current.state.preview.sections[0].id).toBe('new');
  });

  it('drops an answer that arrives after the panel was closed', async () => {
    const slow = deferred();
    const fetchPreview = jest.fn().mockReturnValue(slow.promise);
    const { result } = renderHook(() => useAiPreview(fetchPreview));

    let pending;
    act(() => {
      pending = result.current.open('look', 'x');
    });
    act(() => {
      result.current.close();
    });

    await act(async () => {
      slow.resolve({ sections: [], totals: {} });
      await pending;
    });

    expect(result.current.state).toBeNull();
  });
});
