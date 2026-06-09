import { describe, expect, it } from 'vitest'

import type { BatchManagementRow } from '@/card/stores/store-types'
import {
  DEFAULT_BATCH_SORT,
  filterAndSortBatchRows,
  getBatchStatusTag,
  getBatchSummaryStats,
  groupBatchRowsBySource,
  paginateBatchRows,
} from '@/app/card-manager/batch-management-utils'

const rows: BatchManagementRow[] = [
  {
    id: 'builtin-1',
    name: '系统卡包',
    fileName: 'builtin-base.json',
    importTime: '2026-06-01T00:00:00.000Z',
    lastUpdatedAt: '2026-06-01T00:00:00.000Z',
    cardCount: 10,
    cardTypes: ['profession'],
    storageSize: 2048,
    isSystemBatch: true,
    disabled: false,
    sourceKind: 'builtin',
    healthStatus: 'normal',
    healthMessages: [],
    imageCount: 0,
    totalImageSize: 0,
    activityLog: [],
    hasCustomFields: false,
    hasVariantTypes: false,
  },
  {
    id: 'json-1',
    name: '火焰远征',
    fileName: 'fire.json',
    importTime: '2026-06-03T00:00:00.000Z',
    lastUpdatedAt: '2026-06-03T00:00:00.000Z',
    cardCount: 6,
    cardTypes: ['domain', 'variant'],
    storageSize: 4096,
    isSystemBatch: false,
    disabled: false,
    sourceKind: 'json',
    healthStatus: 'normal',
    healthMessages: [],
    imageCount: 0,
    totalImageSize: 0,
    activityLog: [],
    hasCustomFields: true,
    hasVariantTypes: true,
  },
  {
    id: 'archive-1',
    name: 'Broken Archive',
    fileName: 'broken.dhcb',
    importTime: '2026-06-02T00:00:00.000Z',
    lastUpdatedAt: '2026-06-02T00:00:00.000Z',
    cardCount: 4,
    cardTypes: ['ancestry'],
    storageSize: 8192,
    isSystemBatch: false,
    disabled: true,
    sourceKind: 'archive',
    healthStatus: 'abnormal',
    healthMessages: ['图片缺失'],
    imageCount: 2,
    totalImageSize: 1024,
    activityLog: [],
    hasCustomFields: false,
    hasVariantTypes: false,
  },
]

describe('card manager batch management utils', () => {
  it('searches by name, file name, and batch id', () => {
    expect(filterAndSortBatchRows(rows, { search: '火焰', status: 'all', type: 'all', source: 'all' }, DEFAULT_BATCH_SORT).map((row) => row.id)).toEqual(['json-1'])
    expect(filterAndSortBatchRows(rows, { search: 'broken.dhcb', status: 'all', type: 'all', source: 'all' }, DEFAULT_BATCH_SORT).map((row) => row.id)).toEqual(['archive-1'])
    expect(filterAndSortBatchRows(rows, { search: 'builtin-1', status: 'all', type: 'all', source: 'all' }, DEFAULT_BATCH_SORT).map((row) => row.id)).toEqual(['builtin-1'])
  })

  it('filters by status, type, and source', () => {
    expect(filterAndSortBatchRows(rows, { search: '', status: 'abnormal', type: 'all', source: 'all' }, DEFAULT_BATCH_SORT).map((row) => row.id)).toEqual(['archive-1'])
    expect(filterAndSortBatchRows(rows, { search: '', status: 'all', type: 'custom', source: 'all' }, DEFAULT_BATCH_SORT).map((row) => row.id)).toEqual(['json-1', 'archive-1'])
    expect(filterAndSortBatchRows(rows, { search: '', status: 'all', type: 'all', source: 'builtin' }, DEFAULT_BATCH_SORT).map((row) => row.id)).toEqual(['builtin-1'])
  })

  it('sorts by import time, card count, and name', () => {
    expect(filterAndSortBatchRows(rows, { search: '', status: 'all', type: 'all', source: 'all' }, DEFAULT_BATCH_SORT).map((row) => row.id)).toEqual(['json-1', 'archive-1', 'builtin-1'])
    expect(filterAndSortBatchRows(rows, { search: '', status: 'all', type: 'all', source: 'all' }, { key: 'cardCount', direction: 'asc' }).map((row) => row.id)).toEqual(['archive-1', 'json-1', 'builtin-1'])
    expect(filterAndSortBatchRows(rows, { search: '', status: 'all', type: 'all', source: 'all' }, { key: 'name', direction: 'asc' }).map((row) => row.id)).toEqual(['json-1', 'builtin-1', 'archive-1'])
  })

  it('paginates rows and keeps grouped view on current page results only', () => {
    const filtered = filterAndSortBatchRows(rows, { search: '', status: 'all', type: 'all', source: 'all' }, DEFAULT_BATCH_SORT)
    const paginated = paginateBatchRows(filtered, 2, 2)

    expect(paginated.currentPage).toBe(2)
    expect(paginated.pageRows.map((row) => row.id)).toEqual(['builtin-1'])

    expect(groupBatchRowsBySource(filtered.slice(0, 2))).toEqual([
      {
        sourceKind: 'json',
        label: 'JSON 导入',
        rows: [rows[1]],
      },
      {
        sourceKind: 'archive',
        label: 'ZIP-DHCB 导入',
        rows: [rows[2]],
      },
    ])
  })

  it('computes summary stats and status priority', () => {
    expect(getBatchSummaryStats(rows)).toEqual({
      all: 3,
      enabled: 2,
      custom: 2,
      abnormal: 1,
    })

    expect(getBatchStatusTag(rows[2])).toEqual({ label: '异常', tone: 'destructive' })
    expect(getBatchStatusTag(rows[0])).toEqual({ label: '已启用', tone: 'default' })
    expect(getBatchStatusTag({ healthStatus: 'normal', disabled: true })).toEqual({ label: '未启用', tone: 'secondary' })
  })
})
