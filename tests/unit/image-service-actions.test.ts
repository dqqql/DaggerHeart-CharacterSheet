import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDelete, mockTransaction } = vi.hoisted(() => ({
  mockDelete: vi.fn(),
  mockTransaction: vi.fn(async (_mode: string, _table: unknown, cb: () => Promise<void>) => cb())
}));

vi.mock('@/card/stores/image-service/database', () => ({
  db: {
    images: {
      delete: mockDelete
    },
    transaction: mockTransaction
  },
  isIndexedDBAvailable: () => true
}));

import { createImageServiceActions } from '@/card/stores/image-service/actions';

describe('createImageServiceActions.deleteBatchImages', () => {
  beforeEach(() => {
    mockDelete.mockReset();
    mockTransaction.mockClear();
  });

  it('deletes each unique cardId only once in batch delete transaction', async () => {
    const set = vi.fn();
    const get = vi.fn(() => ({
      imageService: {
        cache: new Map<string, string>(),
        cacheOrder: [],
        failedImages: new Set<string>()
      }
    }));

    const actions = createImageServiceActions(set, get);

    await actions.deleteBatchImages(['card-1', 'card-2', 'card-1', 'card-2', 'card-3']);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledTimes(3);
    expect(mockDelete).toHaveBeenCalledWith('card-1');
    expect(mockDelete).toHaveBeenCalledWith('card-2');
    expect(mockDelete).toHaveBeenCalledWith('card-3');
  });
});
