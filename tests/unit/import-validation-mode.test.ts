import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ImportData } from '@/card/card-types'
import { useUnifiedCardStore } from '@/card/stores/unified-card-store'
import { CardTypeValidator, type ValidationContext } from '@/card/type-validators'

const validationContext: ValidationContext = {
  customFields: {
    professions: [],
    ancestries: [],
    communities: [],
    domains: [],
    variants: [],
  },
  variantTypes: {},
  tempBatchId: 'test-validation',
}

const subclassOnlyImportData: ImportData = {
  name: 'Missing profession references',
  customFieldDefinitions: {},
  subclass: [
    {
      id: 'subclass-missing-profession',
      名称: '失落之刃',
      描述: '测试子职业',
      主职: '未声明主职',
      子职业: '影刃',
      等级: '基石',
      施法: '敏捷',
    },
  ],
}

describe('import validation modes', () => {
  beforeEach(() => {
    localStorage.clear()
    useUnifiedCardStore.setState({
      cards: new Map(),
      batches: new Map(),
      cardsByType: new Map(),
      aggregatedCustomFields: {},
      aggregatedVariantTypes: {},
      cacheValid: true,
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

  it('keeps missing references as errors in strict mode', () => {
    const result = CardTypeValidator.validateImportData(subclassOnlyImportData, validationContext, {
      mode: 'strict',
    })

    expect(result.isValid).toBe(false)
    expect(result.warnings).toHaveLength(0)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'subclass[0].主职',
        }),
      ])
    )
  })

  it('downgrades missing references into warnings in import_relaxed mode', () => {
    const result = CardTypeValidator.validateImportData(subclassOnlyImportData, validationContext, {
      mode: 'import_relaxed',
    })

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'subclass[0].主职',
        }),
      ])
    )
  })

  it('allows importCards to succeed when validation returns warnings', async () => {
    const store = useUnifiedCardStore.getState()

    vi.spyOn(store, '_validateImportData').mockReturnValue({
      isValid: true,
      errors: [],
      warnings: ['subclass[0].主职: 主职字段必须是有效的子职业名称。有效选项: 逸闻剑士 (或用户自定义)'],
    })
    vi.spyOn(store, '_convertImportData').mockResolvedValue({
      success: true,
      cards: [
        {
          id: 'subclass-missing-profession',
          type: 'subclass',
          name: '失落之刃',
        } as any,
      ],
    })
    vi.spyOn(store, '_syncToLocalStorage').mockImplementation(() => {})
    vi.spyOn(store, '_recomputeAggregations').mockImplementation(() => {})
    vi.spyOn(store, '_rebuildCardsByType').mockImplementation(() => {})
    vi.spyOn(store, '_rebuildSubclassIndex').mockImplementation(() => {})
    vi.spyOn(store, 'generateBatchId').mockReturnValue('batch-test')

    const result = await store.importCards(subclassOnlyImportData, 'missing-profession.json')

    expect(result.success).toBe(true)
    expect(result.imported).toBe(1)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('subclass[0].主职'),
      ])
    )
    expect(result.batchId).toBe('batch-test')
  })
})
