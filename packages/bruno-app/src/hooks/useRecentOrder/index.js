import { useState, useCallback } from 'react';

const STORAGE_PREFIX = 'restlab.recentOrder.';

const readStamps = (storageKey) => {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + storageKey);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
};

const writeStamps = (storageKey, stamps) => {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(stamps));
  } catch (error) {
    // Storage can be blocked; the order then lasts only for this session.
  }
};

/**
 * Items touched most recently first. Items never touched keep their original order after them.
 * Stable: equal stamps keep the original order.
 */
export const sortByRecency = (items, getKey, stamps) => {
  return items
    .map((item, index) => ({ item, index, stamp: stamps[getKey(item)] || 0 }))
    .sort((a, b) => b.stamp - a.stamp || a.index - b.index)
    .map(({ item }) => item);
};

/**
 * Remembers which items the user used last, per list, in this browser profile only.
 * `touch(key)` moves an item to the top; nothing about this order is written to the collection files.
 */
const useRecentOrder = (storageKey) => {
  const [stamps, setStamps] = useState(() => readStamps(storageKey));

  const touch = useCallback((key) => {
    setStamps((current) => {
      const latest = Math.max(0, ...Object.values(current));
      const next = { ...current, [key]: Math.max(Date.now(), latest + 1) };
      writeStamps(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const forget = useCallback((key) => {
    setStamps((current) => {
      if (!(key in current)) return current;
      const { [key]: removed, ...rest } = current;
      writeStamps(storageKey, rest);
      return rest;
    });
  }, [storageKey]);

  const sort = useCallback((items, getKey) => sortByRecency(items, getKey, stamps), [stamps]);

  return { sort, touch, forget };
};

export default useRecentOrder;
