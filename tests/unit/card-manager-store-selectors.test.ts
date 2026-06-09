import { beforeEach, describe, expect, it } from 'vitest'

import type { BatchData, CustomCardIndex } from '@/card/stores/store-types'
import { STORAGE_KEYS } from '@/card/stores/store-types'
import { useUnifiedCardStore } from '@/card/stores/unified-card-store'

function resetStoreState() {
  useUnifiedCardStore.setState({
    cards: new Map(),
    batches: new Map(),
    cardsByType: new Map(),
    aggregatedCustomFields: null,
    aggregatedVariantTypes: null,
    cacheValid: false,
    initialized: true,
    index: {
      batches: {},
      totalCards: 0,
      totalBatches: 0,
      lastUpdate: new Date().toISOString(),
    },
  })
}

describe('card manager store selectors and batch actions', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStoreState()
  })

  it('loads legacy batches with metadata fallbacks and keeps corrupted or missing batches as abnormal placeholders', () => {
    const index: CustomCardIndex = {
      batches: {
        'legacy-ok': {
          id: 'legacy-ok',
          name: 'Legacy JSON',
          fileName: 'legacy.json',
          importTime: '2026-06-01T00:00:00.000Z',
          cardCount: 1,
          cardTypes: ['domain'],
          size: 512,
          isSystemBatch: false,
          disabled: false,
        },
        'legacy-corrupt': {
          id: 'legacy-corrupt',
          name: 'Corrupt Batch',
          fileName: 'broken.dhcb',
          importTime: '2026-06-02T00:00:00.000Z',
          cardCount: 3,
          cardTypes: ['variant'],
          size: 256,
          isSystemBatch: false,
          disabled: false,
        },
        'legacy-missing': {
          id: 'legacy-missing',
          name: 'Missing Batch',
          fileName: 'missing.json',
          importTime: '2026-06-03T00:00:00.000Z',
          cardCount: 2,
          cardTypes: ['profession'],
          size: 128,
          isSystemBatch: false,
          disabled: true,
        },
      },
      totalCards: 6,
      totalBatches: 3,
      lastUpdate: '2026-06-03T00:00:00.000Z',
    }

    const legacyBatch: BatchData = {
      metadata: {
        id: 'legacy-ok',
        name: 'Legacy JSON',
        fileName: 'legacy.json',
        importTime: '2026-06-01T00:00:00.000Z',
        description: 'legacy batch',
      },
      cards: [
        {
          standarized: true,
          id: 'domain-1',
          name: '风暴冲击',
          type: 'domain',
          class: '风暴',
          description: 'legacy domain card',
          cardSelectDisplay: {},
        } as any,
      ],
    }

    localStorage.setItem(STORAGE_KEYS.INDEX, JSON.stringify(index))
    localStorage.setItem(`${STORAGE_KEYS.BATCH_PREFIX}legacy-ok`, JSON.stringify(legacyBatch))
    localStorage.setItem(`${STORAGE_KEYS.BATCH_PREFIX}legacy-corrupt`, '{broken json')

    const store = useUnifiedCardStore.getState()
    store._loadCustomCardsFromStorage()

    const rows = store.getBatchManagementRows()
    const legacyRow = rows.find((row) => row.id === 'legacy-ok')
    const corruptRow = rows.find((row) => row.id === 'legacy-corrupt')
    const missingRow = rows.find((row) => row.id === 'legacy-missing')
    const detail = store.getBatchDetail('legacy-ok')

    expect(legacyRow).toMatchObject({
      sourceKind: 'json',
      healthStatus: 'normal',
      lastUpdatedAt: '2026-06-01T00:00:00.000Z',
      healthMessages: [],
    })
    expect(legacyRow?.activityLog).toHaveLength(1)

    expect(corruptRow?.healthStatus).toBe('abnormal')
    expect(corruptRow?.loadError).toContain('批次数据已损坏')

    expect(missingRow?.healthStatus).toBe('abnormal')
    expect(missingRow?.disabled).toBe(true)
    expect(missingRow?.loadError).toContain('批次数据缺失')

    expect(detail?.previewCards).toHaveLength(1)
    expect(detail?.previewCards[0].id).toBe('domain-1')
  })

  it('supports deterministic batch enable-disable and prevents deleting system batches', async () => {
    const store = useUnifiedCardStore.getState()
    const now = '2026-06-04T00:00:00.000Z'

    useUnifiedCardStore.setState({
      batches: new Map([
        ['SYSTEM_BUILTIN_CARDS', {
          id: 'SYSTEM_BUILTIN_CARDS',
          name: 'Builtin',
          fileName: 'builtin-base.json',
          importTime: now,
          lastUpdatedAt: now,
          cardCount: 1,
          cardTypes: ['profession'],
          size: 64,
          isSystemBatch: true,
          disabled: false,
          sourceKind: 'builtin',
          healthStatus: 'normal',
          healthMessages: [],
          activityLog: [],
          cardIds: [],
          imageCount: 0,
          totalImageSize: 0,
        }],
        ['custom-1', {
          id: 'custom-1',
          name: 'Custom',
          fileName: 'custom.json',
          importTime: now,
          lastUpdatedAt: now,
          cardCount: 2,
          cardTypes: ['domain'],
          size: 128,
          isSystemBatch: false,
          disabled: false,
          sourceKind: 'json',
          healthStatus: 'normal',
          healthMessages: [],
          activityLog: [],
          cardIds: [],
          imageCount: 0,
          totalImageSize: 0,
        }],
      ]),
      index: {
        batches: {
          SYSTEM_BUILTIN_CARDS: {
            id: 'SYSTEM_BUILTIN_CARDS',
            name: 'Builtin',
            fileName: 'builtin-base.json',
            importTime: now,
            cardCount: 1,
            cardTypes: ['profession'],
            size: 64,
            isSystemBatch: true,
            disabled: false,
          },
          'custom-1': {
            id: 'custom-1',
            name: 'Custom',
            fileName: 'custom.json',
            importTime: now,
            cardCount: 2,
            cardTypes: ['domain'],
            size: 128,
            isSystemBatch: false,
            disabled: false,
          },
        },
        totalCards: 0,
        totalBatches: 2,
        lastUpdate: now,
      },
    })

    await expect(store.setBatchDisabled('custom-1', true)).resolves.toBe(true)
    expect(useUnifiedCardStore.getState().batches.get('custom-1')?.disabled).toBe(true)
    expect(useUnifiedCardStore.getState().batches.get('custom-1')?.activityLog?.at(-1)?.type).toBe('disabled')

    await expect(store.setBatchDisabled('custom-1', false)).resolves.toBe(true)
    expect(useUnifiedCardStore.getState().batches.get('custom-1')?.disabled).toBe(false)
    expect(useUnifiedCardStore.getState().batches.get('custom-1')?.activityLog?.at(-1)?.type).toBe('enabled')

    expect(store.removeBatches(['SYSTEM_BUILTIN_CARDS'])).toBe(false)
    expect(useUnifiedCardStore.getState().batches.has('SYSTEM_BUILTIN_CARDS')).toBe(true)

    expect(store.removeBatches(['SYSTEM_BUILTIN_CARDS', 'custom-1'])).toBe(true)
    expect(useUnifiedCardStore.getState().batches.has('custom-1')).toBe(false)
    expect(useUnifiedCardStore.getState().batches.has('SYSTEM_BUILTIN_CARDS')).toBe(true)
  })
})
