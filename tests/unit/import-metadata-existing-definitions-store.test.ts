import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ImportData } from '@/card/card-types'
import { useUnifiedCardStore } from '@/card/stores/unified-card-store'

describe('importCards with existing definitions', () => {
  beforeEach(() => {
    localStorage.clear()
    useUnifiedCardStore.setState({
      cards: new Map(),
      batches: new Map([
        [
          'existing-batch',
          {
            id: 'existing-batch',
            name: 'Existing Definitions',
            fileName: 'existing.json',
            importTime: new Date().toISOString(),
            cardIds: [],
            disabled: false,
            imageCardIds: [],
            imageCount: 0,
            totalImageSize: 0,
            healthStatus: 'normal',
            healthMessages: [],
            customFieldDefinitions: {
              professions: ['\u541f\u6e38\u8bd7\u4eba'],
              ancestries: [],
              communities: [],
              domains: ['\u4f18\u96c5'],
              variants: [],
            },
            variantTypes: {},
          } as any,
        ],
      ]),
      cardsByType: new Map(),
      aggregatedCustomFields: null,
      aggregatedVariantTypes: null,
      cacheValid: false,
      initialized: true,
      index: {
        batches: {},
        totalCards: 0,
        totalBatches: 1,
        lastUpdate: new Date().toISOString(),
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not emit metadata warnings when prerequisites are already enabled', async () => {
    const importData: ImportData = {
      name: '\u5315\u9996\u4e16\u754c',
      customFieldDefinitions: {
        professions: ['\u5ba1\u5224\u5b98'],
        domains: ['\u79d8\u5bc6'],
      },
      profession: [
        {
          id: 'profession-1',
          ['\u540d\u79f0']: '\u5ba1\u5224\u5b98',
          ['\u7b80\u4ecb']: 'N/A',
          ['\u9886\u57df1']: '\u79d8\u5bc6',
          ['\u9886\u57df2']: '\u4f18\u96c5',
          ['\u8d77\u59cb\u751f\u547d']: 6,
          ['\u8d77\u59cb\u95ea\u907f']: 10,
          ['\u8d77\u59cb\u7269\u54c1']: ' ',
          ['\u5e0c\u671b\u7279\u6027']: '\u6d4b\u8bd5',
          ['\u804c\u4e1a\u7279\u6027']: '\u6d4b\u8bd5',
        },
      ],
      subclass: [
        {
          id: 'subclass-1',
          ['\u540d\u79f0']: '\u4fa6\u63a2-\u57fa\u77f3',
          ['\u63cf\u8ff0']: '\u6d4b\u8bd5',
          ['\u4e3b\u804c']: '\u541f\u6e38\u8bd7\u4eba',
          ['\u5b50\u804c\u4e1a']: '\u4fa6\u63a2',
          ['\u7b49\u7ea7']: '\u57fa\u77f3',
          ['\u65bd\u6cd5']: '\u672c\u80fd',
        },
      ],
    }

    const store = useUnifiedCardStore.getState()
    vi.spyOn(store, 'generateBatchId').mockReturnValue('batch-existing-defs')
    vi.spyOn(store, '_rebuildSubclassIndex').mockImplementation(() => {})

    const result = await store.importCards(importData, 'dagger-world.json')

    expect(result.success).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])

    const batch = useUnifiedCardStore.getState().batches.get('batch-existing-defs')
    expect(batch?.healthStatus).toBe('normal')
    expect(batch?.healthMessages).toEqual([])
  })
})
