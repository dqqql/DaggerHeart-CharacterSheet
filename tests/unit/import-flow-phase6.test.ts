import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ImportData } from '@/card/card-types'
import { importCustomCards } from '@/card/index'
import { STORAGE_KEYS, type BatchData } from '@/card/stores/store-types'
import { useUnifiedCardStore } from '@/card/stores/unified-card-store'

const normalizationImportData: ImportData = {
  name: 'Phase 6 metadata bootstrap',
  customFieldDefinitions: {
    professions: ['守夜人'],
    domains: ['火焰'],
    variantTypes: {
      神器: {
        description: '保留已有描述',
        subclasses: ['古代'],
        levelRange: [1, 2],
      },
      遗物: {
        subclasses: ['收藏'],
        levelRange: [3, 5],
      },
    } as any,
  },
  profession: [
    {
      id: 'profession-1',
      名称: '夜行者',
      简介: '测试职业',
      领域1: '火焰',
      领域2: '暗影',
      起始生命: 6,
      起始闪避: 1,
      起始物品: '测试物品',
      希望特性: '希望特性',
      职业特性: '职业特性',
    } as any,
  ],
  subclass: [
    {
      id: 'subclass-1',
      名称: '夜影',
      描述: '测试子职业',
      主职: '秘术师',
      子职业: '影刃',
      等级: '基石',
      施法: '敏捷',
    },
  ],
  domain: [
    {
      id: 'domain-1',
      名称: '风暴冲击',
      领域: '风暴',
      描述: '测试领域牌',
      等级: 1,
      属性: '敏捷',
      回想: 0,
    },
  ],
  variant: [
    {
      id: 'variant-1',
      名称: '古代神器',
      类型: '神器',
      子类别: '远古',
      等级: 4,
      效果: '测试神器',
    },
    {
      id: 'variant-2',
      名称: '圣物护符',
      类型: '圣物',
      子类别: '圣位',
      等级: 2,
      效果: '测试圣物',
    },
  ],
}

const expectedDefinitions = {
  professions: ['守夜人', '夜行者', '秘术师'],
  ancestries: [],
  communities: [],
  domains: ['火焰', '暗影', '风暴'],
  variants: ['神器', '圣物'],
}

const expectedVariantTypes = {
  神器: {
    description: '保留已有描述',
    subclasses: ['古代', '远古'],
    levelRange: [1, 4],
  },
  遗物: {
    subclasses: ['收藏'],
    levelRange: [3, 5],
  },
  圣物: {
    subclasses: ['圣位'],
    levelRange: [2, 2],
  },
}

const missingRequiredFieldImportData: ImportData = {
  name: 'Missing required field',
  customFieldDefinitions: {
    professions: ['守夜人'],
    domains: ['火焰', '暗影'],
  },
  profession: [
    {
      id: 'profession-missing-summary',
      名称: '守夜人',
      领域1: '火焰',
      领域2: '暗影',
      起始生命: 6,
      起始闪避: 1,
      起始物品: '测试物品',
      希望特性: '希望特性',
      职业特性: '职业特性',
    } as any,
  ],
}

function resetStoreState() {
  useUnifiedCardStore.setState({
    cards: new Map(),
    batches: new Map(),
    cardsByType: new Map(),
    aggregatedCustomFields: {},
    aggregatedVariantTypes: {},
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

describe('phase 6 import flow regression coverage', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStoreState()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('runs the real relaxed import entry through normalization and persists normalized metadata', async () => {
    const store = useUnifiedCardStore.getState()
    vi.spyOn(store, 'generateBatchId').mockReturnValue('batch-phase6')

    const result = await importCustomCards(normalizationImportData, 'phase6.json')

    expect(result.success).toBe(true)
    expect(result.imported).toBe(5)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('未预先声明的主职'),
        expect.stringContaining('未预先定义的变体类型'),
        expect.stringContaining('系统已根据卡牌内容自动补齐'),
      ])
    )
    expect(result.warnings).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining('profession[0].名称'),
        expect.stringContaining('subclass[0].主职'),
      ])
    )

    const nextState = useUnifiedCardStore.getState()
    const batch = nextState.batches.get('batch-phase6')

    expect(batch?.customFieldDefinitions).toEqual(expectedDefinitions)
    expect(batch?.variantTypes).toEqual(expectedVariantTypes)
    expect(nextState.getAggregatedCustomFields()).toEqual(expectedDefinitions)
    expect(nextState.getAggregatedVariantTypes()).toEqual(expectedVariantTypes)

    const persistedBatch = JSON.parse(
      localStorage.getItem(`${STORAGE_KEYS.BATCH_PREFIX}batch-phase6`) ?? '{}'
    ) as BatchData

    expect(persistedBatch.customFieldDefinitions).toEqual(expectedDefinitions)
    expect(persistedBatch.variantTypes).toEqual(expectedVariantTypes)
  })

  it('loads normalized metadata back from storage through _loadCustomCardsFromStorage', async () => {
    const store = useUnifiedCardStore.getState()
    vi.spyOn(store, 'generateBatchId').mockReturnValue('batch-reload')

    const result = await importCustomCards(normalizationImportData, 'reload.json')
    expect(result.success).toBe(true)

    resetStoreState()

    const reloadedStore = useUnifiedCardStore.getState()
    reloadedStore._loadCustomCardsFromStorage()
    reloadedStore._recomputeAggregations()
    reloadedStore._rebuildCardsByType()

    const stateAfterReload = useUnifiedCardStore.getState()
    const batch = stateAfterReload.batches.get('batch-reload')

    expect(batch?.customFieldDefinitions).toEqual(expectedDefinitions)
    expect(batch?.variantTypes).toEqual(expectedVariantTypes)
    expect(stateAfterReload.cards.get('variant-1')?.batchId).toBe('batch-reload')
    expect(stateAfterReload.getAggregatedCustomFields()).toEqual(expectedDefinitions)
    expect(stateAfterReload.getAggregatedVariantTypes()).toEqual(expectedVariantTypes)
  })

  it('still fails on duplicate ids even after relaxed validation and normalization warnings pass', async () => {
    const store = useUnifiedCardStore.getState()
    vi.spyOn(store, 'generateBatchId').mockReturnValue('batch-initial')

    const firstImport = await importCustomCards(normalizationImportData, 'initial.json')
    expect(firstImport.success).toBe(true)

    const duplicateImport = await importCustomCards(normalizationImportData, 'duplicate.json')

    expect(duplicateImport.success).toBe(false)
    expect(duplicateImport.imported).toBe(0)
    expect(duplicateImport.errors).toEqual([
      'Duplicate card IDs found: profession-1, subclass-1, domain-1, variant-1, variant-2',
    ])
  })

  it('still fails when required fields are missing in relaxed import mode', async () => {
    const result = await importCustomCards(missingRequiredFieldImportData, 'missing-required.json')

    expect(result.success).toBe(false)
    expect(result.imported).toBe(0)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('profession[0].简介'),
      ])
    )
  })
})
