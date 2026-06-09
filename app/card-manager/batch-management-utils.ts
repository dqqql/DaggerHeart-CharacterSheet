import type { BatchDetail, BatchManagementRow, BatchSourceKind } from '@/card/stores/store-types'

export type BatchStatusFilter = 'all' | 'enabled' | 'disabled' | 'abnormal'
export type BatchTypeFilter = 'all' | 'system' | 'custom'
export type BatchSourceFilter = 'all' | BatchSourceKind
export type BatchSortKey = 'importTime' | 'cardCount' | 'name'
export type BatchViewMode = 'list' | 'grouped'

export interface BatchFilterState {
  search: string
  status: BatchStatusFilter
  type: BatchTypeFilter
  source: BatchSourceFilter
}

export interface BatchSortState {
  key: BatchSortKey
  direction: 'asc' | 'desc'
}

export const DEFAULT_BATCH_FILTERS: BatchFilterState = {
  search: '',
  status: 'all',
  type: 'all',
  source: 'all',
}

export const DEFAULT_BATCH_SORT: BatchSortState = {
  key: 'importTime',
  direction: 'desc',
}

export const SOURCE_LABELS: Record<BatchSourceKind, string> = {
  builtin: '系统内置',
  json: 'JSON 导入',
  archive: 'ZIP-DHCB 导入',
  unknown: '未知',
}

export const STATUS_LABELS = {
  all: '全部',
  enabled: '已启用',
  disabled: '未启用',
  abnormal: '异常',
} as const

export function getBatchStatusTag(row: Pick<BatchManagementRow, 'healthStatus' | 'disabled'>) {
  if (row.healthStatus === 'abnormal') {
    return { label: '异常', tone: 'destructive' as const }
  }

  if (row.disabled) {
    return { label: '未启用', tone: 'secondary' as const }
  }

  return { label: '已启用', tone: 'default' as const }
}

function matchesSearch(row: BatchManagementRow, search: string) {
  if (!search) {
    return true
  }

  const normalizedSearch = search.trim().toLowerCase()
  if (!normalizedSearch) {
    return true
  }

  return [row.name, row.fileName, row.id].some((value) =>
    value.toLowerCase().includes(normalizedSearch)
  )
}

function matchesStatus(row: BatchManagementRow, status: BatchStatusFilter) {
  switch (status) {
    case 'enabled':
      return !row.disabled
    case 'disabled':
      return row.disabled
    case 'abnormal':
      return row.healthStatus === 'abnormal'
    default:
      return true
  }
}

function matchesType(row: BatchManagementRow, type: BatchTypeFilter) {
  switch (type) {
    case 'system':
      return row.isSystemBatch
    case 'custom':
      return !row.isSystemBatch
    default:
      return true
  }
}

function matchesSource(row: BatchManagementRow, source: BatchSourceFilter) {
  return source === 'all' ? true : row.sourceKind === source
}

function compareRows(a: BatchManagementRow, b: BatchManagementRow, sort: BatchSortState) {
  const direction = sort.direction === 'asc' ? 1 : -1

  switch (sort.key) {
    case 'cardCount':
      return (a.cardCount - b.cardCount) * direction
    case 'name':
      return a.name.localeCompare(b.name, 'zh-CN') * direction
    case 'importTime':
    default:
      return a.importTime.localeCompare(b.importTime) * direction
  }
}

export function filterAndSortBatchRows(
  rows: BatchManagementRow[],
  filters: BatchFilterState,
  sort: BatchSortState
) {
  return [...rows]
    .filter((row) => matchesSearch(row, filters.search))
    .filter((row) => matchesStatus(row, filters.status))
    .filter((row) => matchesType(row, filters.type))
    .filter((row) => matchesSource(row, filters.source))
    .sort((a, b) => compareRows(a, b, sort))
}

export function paginateBatchRows(rows: BatchManagementRow[], page: number, pageSize: number) {
  const safePageSize = Math.max(1, pageSize)
  const totalPages = Math.max(1, Math.ceil(rows.length / safePageSize))
  const currentPage = Math.min(Math.max(page, 1), totalPages)
  const start = (currentPage - 1) * safePageSize

  return {
    currentPage,
    totalPages,
    pageRows: rows.slice(start, start + safePageSize),
  }
}

export function groupBatchRowsBySource(rows: BatchManagementRow[]) {
  const orderedSources: BatchSourceKind[] = ['builtin', 'json', 'archive', 'unknown']

  return orderedSources
    .map((sourceKind) => ({
      sourceKind,
      label: SOURCE_LABELS[sourceKind],
      rows: rows.filter((row) => row.sourceKind === sourceKind),
    }))
    .filter((group) => group.rows.length > 0)
}

export function getBatchSummaryStats(rows: BatchManagementRow[]) {
  return {
    all: rows.length,
    enabled: rows.filter((row) => !row.disabled).length,
    custom: rows.filter((row) => !row.isSystemBatch).length,
    abnormal: rows.filter((row) => row.healthStatus === 'abnormal').length,
  }
}

export function formatBytes(bytes: number) {
  if (bytes <= 0) {
    return '0 KB'
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return `${(bytes / 1024).toFixed(1)} KB`
}

export function formatBatchTypeSummary(row: Pick<BatchManagementRow, 'cardTypes'>) {
  return row.cardTypes.length > 0 ? row.cardTypes.join(' / ') : '未识别'
}

export function getBatchRecentActivity(batch: Pick<BatchDetail, 'activityLog' | 'importTime'>) {
  if (batch.activityLog.length === 0) {
    return batch.importTime
  }

  return batch.activityLog[batch.activityLog.length - 1].at
}
