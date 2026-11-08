import { renderHook, act } from '@testing-library/react';
import useRecentOrder, { sortByRecency } from './index';

const items = [{ name: 'Dev' }, { name: 'Staging' }, { name: 'Prod' }];
const key = (item) => item.name;

describe('sortByRecency', () => {
  it('puts the most recently used first and keeps the rest in their original order', () => {
    const sorted = sortByRecency(items, key, { Prod: 5, Staging: 9 });
    expect(sorted.map(key)).toEqual(['Staging', 'Prod', 'Dev']);
  });

  it('leaves the list as it is when nothing has been used', () => {
    expect(sortByRecency(items, key, {}).map(key)).toEqual(['Dev', 'Staging', 'Prod']);
  });
});

describe('useRecentOrder', () => {
  beforeEach(() => window.localStorage.clear());

  it('moves a touched item to the top, and the latest touch wins even within the same millisecond', () => {
    const { result } = renderHook(() => useRecentOrder('c1'));
    act(() => {
      result.current.touch('Prod');
      result.current.touch('Staging');
    });
    expect(result.current.sort(items, key).map(key)).toEqual(['Staging', 'Prod', 'Dev']);
  });

  it('remembers the order for the same list in a new session, and keeps lists apart', () => {
    const first = renderHook(() => useRecentOrder('c1'));
    act(() => first.result.current.touch('Prod'));

    const sameList = renderHook(() => useRecentOrder('c1'));
    const otherList = renderHook(() => useRecentOrder('c2'));
    expect(sameList.result.current.sort(items, key).map(key)[0]).toBe('Prod');
    expect(otherList.result.current.sort(items, key).map(key)[0]).toBe('Dev');
  });

  it('forgets an item that was removed', () => {
    const { result } = renderHook(() => useRecentOrder('c1'));
    act(() => result.current.touch('Prod'));
    act(() => result.current.forget('Prod'));
    expect(result.current.sort(items, key).map(key)).toEqual(['Dev', 'Staging', 'Prod']);
  });

  it('works when storage is blocked', () => {
    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const { result } = renderHook(() => useRecentOrder('c1'));
    expect(result.current.sort(items, key)).toHaveLength(3);
    spy.mockRestore();
  });
});
