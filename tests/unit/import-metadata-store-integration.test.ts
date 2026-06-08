import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BatchData } from '@/card/stores/store-types'
import { STORAGE_KEYS } from '@/card/stores/store-types'
import { useUnifiedCardStore } from '@/card/stores/unified-card-store'
import type { ImportData } from '@/card/card-types'

const importData: ImportData = {
  name: 'Phase 4 metadata bootstrap',
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
    },
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
    },
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
      子类别: '圣佑',
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
    subclasses: ['圣佑'],
    levelRange: [2, 2],
  },
}

describe('importCards metadata normalization integration', () => {
  beforeEach(() => {
    localStorage.clear()
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stores normalized metadata in batch state, aggregations, and localStorage', async () => {
    const store = useUnifiedCardStore.getState()
    vi.spyOn(store, 'generateBatchId').mockReturnValue('batch-phase4')
    vi.spyOn(store, '_validateImportData').mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [
        'profession[0].名称: 名称字段必须是有效的职业名称。有效选项: 守夜人 (或用户自定义)',
        'subclass[0].主职: 主职字段必须是有效的子职业名称。有效选项: 守夜人 (或用户自定义)',
      ],
    })
    vi.spyOn(store, '_rebuildSubclassIndex').mockImplementation(() => {})

    const result = await store.importCards(importData, 'phase4.json')

    expect(result.success).toBe(true)
    expect(result.imported).toBe(5)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        '有子职业引用了未预先声明的主职：秘术师。系统已按卡牌内容继续导入，并补齐这些主职定义。',
        '发现未预先定义的变体类型：圣物。系统已根据对应卡牌内容自动建立这些类型。',
        '以下定义未在导入文件中预先声明，系统已根据卡牌内容自动补齐：职业：夜行者；领域：暗影、风暴。',
      ])
    )

    const nextState = useUnifiedCardStore.getState()
    const batch = nextState.batches.get('batch-phase4')

    expect(batch).toBeDefined()
    expect(batch?.customFieldDefinitions).toEqual(expectedDefinitions)
    expect(batch?.variantTypes).toEqual(expectedVariantTypes)

    expect(nextState.getAggregatedCustomFields()).toEqual(expectedDefinitions)
    expect(nextState.getAggregatedVariantTypes()).toEqual(expectedVariantTypes)

    const persistedBatch = JSON.parse(
      localStorage.getItem(`${STORAGE_KEYS.BATCH_PREFIX}batch-phase4`) ?? '{}'
    ) as BatchData

    expect(persistedBatch.customFieldDefinitions).toEqual(expectedDefinitions)
    expect(persistedBatch.variantTypes).toEqual(expectedVariantTypes)
    expect(nextState.cards.get('variant-1')?.batchId).toBe('batch-phase4')
    expect(nextState.cards.get('variant-1')?.source).toBe('custom')
  })
})
