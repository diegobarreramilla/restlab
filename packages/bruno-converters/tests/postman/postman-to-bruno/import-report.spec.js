import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';
import { makeCollection, makeRequest } from '../../common/postman-collection';

const makeFolder = (name, items) => ({ name, item: items });

describe('postman import report', () => {
  it('reports the source total and the imported count when two items are unsupported', async () => {
    const items = [
      makeRequest('One'),
      makeRequest('Two'),
      { name: 'Bad One', request: { method: null, header: [], url: { raw: 'https://example.com' } } },
      { name: 'Bad Two', request: { method: '', header: [], url: { raw: 'https://example.com' } } },
      makeFolder('Folder', [makeRequest('Three'), makeRequest('Four')])
    ];

    const { collection, issues, totalItems, importedItems, importedBreakdown } = await postmanToBruno(
      makeCollection(items)
    );

    // 4 valid requests + 1 folder + 2 skipped requests
    expect(totalItems).toBe(7);
    expect(importedItems).toBe(5);
    expect(importedItems).toBe(totalItems - 2);
    expect(importedBreakdown).toEqual({ requests: 4, folders: 1, environments: 0 });

    expect(collection.items).toHaveLength(3);
    expect(issues.filter((issue) => issue.severity === 'error')).toHaveLength(2);
  });

  it('counts empty folders as imported items', async () => {
    const { totalItems, importedItems, importedBreakdown } = await postmanToBruno(
      makeCollection([makeRequest('One'), makeFolder('Empty', [])])
    );

    expect(totalItems).toBe(2);
    expect(importedItems).toBe(2);
    expect(importedBreakdown).toEqual({ requests: 1, folders: 1, environments: 0 });
  });
});
