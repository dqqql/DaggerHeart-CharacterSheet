import { describe, expect, it, vi } from "vitest"

import { createStoreActions } from "@/card/stores/store-actions"
import { useUnifiedCardStore } from "@/card/stores/unified-card-store"

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

describe("unified card store initialization", () => {
  it("starts with empty rebuildable card indexes", () => {
    const initialState = useUnifiedCardStore.getInitialState()

    expect(initialState.cardsByType).toEqual(new Map())
    expect(initialState.cardsByRuleSetAndType).toEqual(new Map())
  })

  it("shares one in-flight promise across concurrent callers", async () => {
    const migration = deferred<null>()
    let state: any
    const set = vi.fn((partial: any) => {
      Object.assign(state, typeof partial === "function" ? partial(state) : partial)
    })
    const get = () => state
    const actions = createStoreActions(set as any, get as any)

    state = {
      initialized: false,
      loading: false,
      _migrateLegacyData: vi.fn(() => migration.promise),
      _loadAllCards: vi.fn().mockResolvedValue(undefined),
      _recomputeAggregations: vi.fn(),
      _rebuildCardsByType: vi.fn(),
      _rebuildSubclassIndex: vi.fn(),
      _preprocessCardImages: vi.fn(),
      initializeImageService: vi.fn().mockResolvedValue(undefined),
      _syncToLocalStorage: vi.fn(),
      _computeStats: vi.fn(() => ({ totalCards: 0 })),
    }

    const first = actions.initializeSystem()
    const second = actions.initializeSystem()

    expect(second).toBe(first)
    expect(state._migrateLegacyData).toHaveBeenCalledTimes(1)

    migration.resolve(null)
    await expect(Promise.all([first, second])).resolves.toEqual([
      { initialized: true, migrationResult: null },
      { initialized: true, migrationResult: null },
    ])
    expect(state._loadAllCards).toHaveBeenCalledTimes(1)
    expect(state._rebuildCardsByType).toHaveBeenCalledTimes(1)
    expect(state.initializeImageService).toHaveBeenCalledTimes(1)
  })

  it("clears the in-flight cache after a failed attempt so initialization can retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    let state: any
    const set = vi.fn((partial: any) => {
      Object.assign(state, typeof partial === "function" ? partial(state) : partial)
    })
    const get = () => state
    const actions = createStoreActions(set as any, get as any)

    state = {
      initialized: false,
      loading: false,
      _migrateLegacyData: vi
        .fn()
        .mockRejectedValueOnce(new Error("failed"))
        .mockResolvedValueOnce(null),
      _loadAllCards: vi.fn().mockResolvedValue(undefined),
      _recomputeAggregations: vi.fn(),
      _rebuildCardsByType: vi.fn(),
      _rebuildSubclassIndex: vi.fn(),
      _preprocessCardImages: vi.fn(),
      initializeImageService: vi.fn().mockResolvedValue(undefined),
      _syncToLocalStorage: vi.fn(),
      _computeStats: vi.fn(() => ({ totalCards: 0 })),
    }

    await expect(actions.initializeSystem()).resolves.toEqual({ initialized: false })
    await expect(actions.initializeSystem()).resolves.toEqual({
      initialized: true,
      migrationResult: null,
    })
    expect(state._migrateLegacyData).toHaveBeenCalledTimes(2)
    expect(state._loadAllCards).toHaveBeenCalledTimes(1)
  })
})
