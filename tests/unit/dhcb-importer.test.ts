import JSZip from 'jszip'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CardSource, type ImportData } from '@/card/card-types'
import { useUnifiedCardStore } from '@/card/stores/unified-card-store'
import { DhcbImportError, importDhcbCardPackage } from '@/card/utils/dhcb-importer'

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

function createPackageImportData(): ImportData {
  return {
    name: 'Package import test',
    customFieldDefinitions: {
      professions: ['守夜人'],
      domains: ['火焰', '暗影'],
    },
    profession: [
      {
        id: 'card-1',
        名称: '守夜人',
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
  }
}

async function createDhcbFile(importData: ImportData, imageNames: string[] = ['card-1.png']) {
  const zip = new JSZip()
  zip.file('cards.json', JSON.stringify(importData))

  imageNames.forEach((imageName) => {
    zip.file(`images/${imageName}`, new Uint8Array([1, 2, 3]))
  })

  const blob = await zip.generateAsync({ type: 'blob' })
  return new File([blob], 'package.dhcb', { type: 'application/zip' })
}

describe('importDhcbCardPackage failure layering', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    resetStoreState()
  })

  it('surfaces validation errors and warnings without collapsing them into image errors', async () => {
    const file = await createDhcbFile(createPackageImportData())
    const store = useUnifiedCardStore.getState()

    vi.spyOn(store, 'importCards').mockResolvedValue({
      success: false,
      imported: 0,
      errors: ['duplicate id'],
      warnings: ['normalized warning'],
      batchId: '',
    })

    await expect(importDhcbCardPackage(file)).rejects.toMatchObject({
      validationErrors: ['duplicate id'],
      warnings: ['normalized warning'],
      imageErrors: [],
    })
  })

  it('reports orphan images through imageErrors and rolls back the imported batch', async () => {
    const file = await createDhcbFile(createPackageImportData())

    useUnifiedCardStore.setState((state) => ({
      ...state,
      batches: new Map([
        [
          'batch-orphan',
          {
            id: 'batch-orphan',
            name: 'Orphan batch',
            fileName: 'package.dhcb',
            importTime: new Date().toISOString(),
            cardCount: 1,
            cardTypes: ['profession'],
            size: 1,
            disabled: false,
            cardIds: ['card-2'],
            isSystemBatch: false,
          },
        ],
      ]),
    }))

    const store = useUnifiedCardStore.getState()
    const removeBatchSpy = vi.spyOn(store, 'removeBatch').mockReturnValue(true)
    vi.spyOn(store, 'importCards').mockResolvedValue({
      success: true,
      imported: 1,
      errors: [],
      warnings: ['normalized warning'],
      batchId: 'batch-orphan',
    })

    await expect(importDhcbCardPackage(file)).rejects.toMatchObject({
      validationErrors: [],
      warnings: ['normalized warning'],
      imageErrors: [expect.stringContaining('card-1')],
    })
    expect(removeBatchSpy).toHaveBeenCalledWith('batch-orphan')
  })

  it('reports image import failures through imageErrors and rolls back the imported batch', async () => {
    const file = await createDhcbFile(createPackageImportData())

    useUnifiedCardStore.setState((state) => ({
      ...state,
      batches: new Map([
        [
          'batch-image-import',
          {
            id: 'batch-image-import',
            name: 'Image batch',
            fileName: 'package.dhcb',
            importTime: new Date().toISOString(),
            cardCount: 1,
            cardTypes: ['profession'],
            size: 1,
            disabled: false,
            cardIds: ['card-1'],
            isSystemBatch: false,
          },
        ],
      ]),
      cards: new Map([
        [
          'card-1',
          {
            id: 'card-1',
            type: 'profession',
            name: '守夜人',
            batchId: 'batch-image-import',
            source: CardSource.CUSTOM,
          } as any,
        ],
      ]),
    }))

    const store = useUnifiedCardStore.getState()
    const removeBatchSpy = vi.spyOn(store, 'removeBatch').mockReturnValue(true)
    vi.spyOn(store, 'importCards').mockResolvedValue({
      success: true,
      imported: 1,
      errors: [],
      warnings: ['normalized warning'],
      batchId: 'batch-image-import',
    })
    vi.spyOn(store, 'importBatchImages').mockRejectedValue(new Error('indexeddb unavailable'))

    await expect(importDhcbCardPackage(file)).rejects.toMatchObject({
      validationErrors: [],
      warnings: ['normalized warning'],
      imageErrors: [expect.stringContaining('indexeddb unavailable')],
    })
    expect(removeBatchSpy).toHaveBeenCalledWith('batch-image-import')
  })
})
