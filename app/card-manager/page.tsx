'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Edit3, Eye, FileText, HardDrive, Home, Info, Layers3, LayoutList, Package, PenSquare, Power, PowerOff, RefreshCw, Search, ShieldAlert, Trash2, TriangleAlert, Upload } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DocumentModal } from '@/components/modals/document-modal'
import { ViewCardsModal } from '@/components/modals/view-cards-modal'
import {
  clearAllCustomCards,
  getBatchDetail,
  getBatchManagementRows,
  importCustomCards,
  removeBatches,
  setBatchDisabled,
  type ExtendedStandardCard,
  type ImportData,
  type ImportResult,
} from '@/card/index'
import { DhcbImportError, importDhcbCardPackage } from '@/card/utils/dhcb-importer'
import { CARD_PACKAGE_IMPORT_ACCEPT, isCardPackageArchiveFileName } from '@/card/utils/card-package-file'
import { STORAGE_KEYS, useUnifiedCardStore } from '@/card/stores/unified-card-store'
import type { BatchDetail, BatchManagementRow } from '@/card/stores/store-types'
import { getAllCharacterStorageKeys } from '@/lib/multi-character-storage'
import { navigateToPage } from '@/lib/utils'
import aiGuideContent from '@/public/自定义卡包指南和示例/AI-卡包创作指南.md'
import exampleJsonData from '@/public/自定义卡包指南和示例/神州战役卡牌包.json'
import userGuideContent from '@/public/自定义卡包指南和示例/用户指南.md'

import {
  DEFAULT_BATCH_FILTERS,
  DEFAULT_BATCH_SORT,
  SOURCE_LABELS,
  STATUS_LABELS,
  filterAndSortBatchRows,
  formatBatchTypeSummary,
  formatBytes,
  getBatchRecentActivity,
  getBatchStatusTag,
  getBatchSummaryStats,
  groupBatchRowsBySource,
  paginateBatchRows,
  type BatchFilterState,
  type BatchSortState,
  type BatchViewMode,
} from './batch-management-utils'
import {
  buildFailedDhcbResult as buildFailedDhcbResultHelper,
  getImportIssueSections as getImportIssueSectionsHelper,
  getImportStatusErrorMessage as getImportStatusErrorMessageHelper,
} from './import-result-utils'

const exampleJsonContent = JSON.stringify(exampleJsonData, null, 2)
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const
const PROJECT_LOCAL_STORAGE_KEYS = [
  'announcement-storage',
  'dual-page-storage',
  'official-image-pack-storage',
  'text-mode-storage',
  STORAGE_KEYS.CONFIG,
] as const

interface ImportStatus {
  isImporting: boolean
  result: ImportResult | ImportResultWithFileName[] | null
  error: string | null
}

interface ImportResultWithFileName extends ImportResult {
  fileName: string
  imageCount?: number
}

type DisplayImportResult = ImportResult | ImportResultWithFileName

function clearProjectLocalStorage(): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  const keysToRemove = Array.from(
    new Set([
      ...getAllCharacterStorageKeys(),
      ...PROJECT_LOCAL_STORAGE_KEYS,
    ])
  ).filter((key) => localStorage.getItem(key) !== null)

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key)
  })

  return keysToRemove
}

function getResultWarnings(result: DisplayImportResult) {
  return result.warnings ?? []
}

function getResultImageErrors(result: DisplayImportResult) {
  return result.imageErrors ?? []
}

function hasResultHints(result: DisplayImportResult) {
  return getResultWarnings(result).length > 0 || getResultImageErrors(result).length > 0
}

function getResultContainerClass(result: DisplayImportResult) {
  if (!result.success) {
    return 'bg-red-50 border border-red-200'
  }

  if (hasResultHints(result)) {
    return 'bg-amber-50 border border-amber-200'
  }

  return 'bg-green-50 border border-green-200'
}

function getResultTitleClass(result: DisplayImportResult) {
  if (!result.success) {
    return 'text-red-700'
  }

  if (hasResultHints(result)) {
    return 'text-amber-700'
  }

  return 'text-green-700'
}

function getResultSummaryClass(result: DisplayImportResult) {
  if (!result.success) {
    return 'text-red-600'
  }

  if (hasResultHints(result)) {
    return 'text-amber-700'
  }

  return 'text-green-600'
}

function getResultTitle(result: DisplayImportResult) {
  if (!result.success) {
    return '导入失败'
  }

  if (hasResultHints(result)) {
    return '导入成功，但有以下提示'
  }

  return '导入成功'
}

function BatchMetricCard({
  icon: Icon,
  label,
  value,
  hint,
  active,
  accent = 'slate',
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  hint: string
  active?: boolean
  accent?: 'slate' | 'green' | 'blue' | 'red'
  onClick?: () => void
}) {
  const accentClasses = {
    slate: 'text-slate-600 bg-slate-100 border-slate-200',
    green: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    red: 'text-red-500 bg-red-50 border-red-100',
  }

  const valueClasses = {
    slate: 'text-slate-900',
    green: 'text-slate-900',
    blue: 'text-slate-900',
    red: 'text-red-500',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-3 text-left transition ${active ? 'border-slate-400 bg-slate-100' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-md border ${accentClasses[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="text-[11px] text-slate-400">{hint}</p>
        </div>
      </div>
      <div className="mt-3">
        <span className={`text-[2rem] font-semibold tracking-tight ${valueClasses[accent]}`}>{value}</span>
      </div>
    </button>
  )
}

function StatusPill({ row }: { row: BatchManagementRow }) {
  if (row.healthStatus === 'abnormal') {
    return <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-500">异常</span>
  }

  if (row.disabled) {
    return <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-500">未启用</span>
  }

  return <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-500">已启用</span>
}

function StorageUsageDial({ percent }: { percent: number }) {
  const safePercent = Math.max(0, Math.min(percent, 100))

  return (
    <div
      className="relative flex h-[92px] w-[92px] items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(#334155 ${safePercent}%, #e5e7eb ${safePercent}% 100%)`,
      }}
    >
      <div className="absolute inset-[10px] rounded-full bg-white" />
      <div className="relative flex flex-col items-center">
        <span className="text-lg font-semibold text-slate-900">{safePercent.toFixed(1)}%</span>
        <span className="text-[11px] text-slate-400">已使用</span>
      </div>
    </div>
  )
}

function renderIssueSection(
  title: string,
  items: string[] | undefined,
  tone: 'warning' | 'error'
) {
  if (!items || items.length === 0) {
    return null
  }

  const titleClass = tone === 'warning' ? 'text-amber-700' : 'text-red-600'
  const listClass = tone === 'warning' ? 'text-amber-700' : 'text-red-600'

  return (
    <div className="mt-2">
      <p className={`${titleClass} text-sm font-medium mb-1`}>{title}</p>
      <ul className={`${listClass} text-sm list-disc list-inside`}>
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function renderImportResultCard(result: DisplayImportResult, key: React.Key) {
  const titleClass = getResultTitleClass(result)
  const summaryClass = getResultSummaryClass(result)

  return (
    <div key={key} className={`p-3 rounded-lg ${getResultContainerClass(result)}`}>
      <div className="flex items-center gap-2 mb-2">
        {result.success ? (
          <Info className={`h-4 w-4 ${hasResultHints(result) ? 'text-amber-600' : 'text-green-600'}`} />
        ) : (
          <AlertCircle className="h-4 w-4 text-red-600" />
        )}
        <span className={`font-medium ${titleClass}`}>
          {getResultTitle(result)}
        </span>
        {'fileName' in result && (
          <span className="ml-2 text-xs text-muted-foreground">{result.fileName}</span>
        )}
      </div>
      {result.success && (
        <div className="space-y-1">
          <p className={`${summaryClass} text-sm`}>
            成功导入 {result.imported} 张卡牌
            {result.batchId && ` (批次ID: ${result.batchId})`}
          </p>
          {'imageCount' in result && result.imageCount !== undefined && result.imageCount > 0 && (
            <p className={`${summaryClass} text-sm`}>
              导入 {result.imageCount} 张图片
            </p>
          )}
        </div>
      )}
      {getImportIssueSectionsHelper(result).map((section) => (
        <React.Fragment key={`${String(key)}-${section.title}`}>
          {renderIssueSection(section.title, section.items, section.tone)}
        </React.Fragment>
      ))}
      {result.duplicateIds && result.duplicateIds.length > 0 && (
        <div className="mt-2">
          <p className="text-red-600 text-sm font-medium mb-1">重复的ID：</p>
          <div className="flex flex-wrap gap-1">
            {result.duplicateIds.map((id, index) => (
              <Badge key={index} variant="destructive" className="text-xs">
                {id}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CardManagerPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [importStatus, setImportStatus] = useState<ImportStatus>({
    isImporting: false,
    result: null,
    error: null,
  })
  const [dragActive, setDragActive] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [documentModalOpen, setDocumentModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingCards, setViewingCards] = useState<ExtendedStandardCard[]>([])
  const [viewingTitle, setViewingTitle] = useState('卡牌详情')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState('overview')
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([])
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<BatchFilterState>(DEFAULT_BATCH_FILTERS)
  const [sort, setSort] = useState<BatchSortState>(DEFAULT_BATCH_SORT)
  const [viewMode, setViewMode] = useState<BatchViewMode>('list')
  const [pageSize, setPageSize] = useState<number>(20)
  const [page, setPage] = useState(1)
  const [batchRows, setBatchRows] = useState<BatchManagementRow[]>([])
  const [allCardsCount, setAllCardsCount] = useState(0)
  const [storageInfo, setStorageInfo] = useState({
    used: '0 KB',
    available: '0 KB',
    total: '0 KB',
    usagePercent: 0,
  })

  const refreshData = async () => {
    if (typeof window === 'undefined') {
      return
    }

    const store = useUnifiedCardStore.getState()
    if (!store.initialized) {
      const result = await store.initializeSystem()
      if (!result.initialized) {
        return
      }
    }

    setBatchRows(getBatchManagementRows())
    setAllCardsCount(store.loadAllCards().length)
    setStorageInfo(store.getStorageInfo())
  }

  useEffect(() => {
    const initializeData = async () => {
      setIsClient(true)
      await refreshData()
    }

    initializeData()
  }, [])

  useEffect(() => {
    if (!autoRefresh || !isClient) {
      return
    }

    const interval = setInterval(() => {
      refreshData()
    }, 5000)

    return () => clearInterval(interval)
  }, [autoRefresh, isClient])

  useEffect(() => {
    setSelectedBatchIds(new Set())
    setPage(1)
  }, [filters.search, filters.source, filters.status, filters.type])

  useEffect(() => {
    if (selectedBatchId && !batchRows.some((row) => row.id === selectedBatchId)) {
      setSelectedBatchId(null)
      setDetailOpen(false)
    }
  }, [batchRows, selectedBatchId])

  const filteredRows = useMemo(
    () => filterAndSortBatchRows(batchRows, filters, sort),
    [batchRows, filters, sort]
  )
  const paginatedRows = useMemo(
    () => paginateBatchRows(filteredRows, page, pageSize),
    [filteredRows, page, pageSize]
  )
  const groupedRows = useMemo(
    () => groupBatchRowsBySource(paginatedRows.pageRows),
    [paginatedRows.pageRows]
  )
  const summaryStats = useMemo(() => getBatchSummaryStats(batchRows), [batchRows])

  const batchDetail = useMemo(() => {
    if (!selectedBatchId) {
      return null
    }

    return getBatchDetail(selectedBatchId)
  }, [selectedBatchId, batchRows])

  const selectedRows = useMemo(
    () => batchRows.filter((row) => selectedBatchIds.has(row.id)),
    [batchRows, selectedBatchIds]
  )
  const selectedRemovableRows = selectedRows.filter((row) => !row.isSystemBatch)
  const allVisibleSelected = paginatedRows.pageRows.length > 0 && paginatedRows.pageRows.every((row) => selectedBatchIds.has(row.id))

  const goBackToMain = () => {
    navigateToPage('/')
  }

  const openSystemFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const openBatchDetail = (batchId: string) => {
    setSelectedBatchId(batchId)
    setDetailTab('overview')
    setDetailOpen(true)
  }

  const handleViewCards = (batchId?: string) => {
    const store = useUnifiedCardStore.getState()
    const cardsToView = batchId
      ? Array.from(store.cards.values()).filter((card) => card.batchId === batchId)
      : store.loadAllCards()

    setViewingCards(cardsToView)
    setViewingTitle(batchId ? `卡牌详情（${cardsToView.length} 张）` : `全部卡牌（${cardsToView.length} 张）`)
    setViewModalOpen(true)
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArr = Array.from(files)
    const invalid = fileArr.find((file) =>
      !file.name.toLowerCase().endsWith('.json') &&
      !isCardPackageArchiveFileName(file.name)
    )

    if (invalid) {
      setImportStatus({
        isImporting: false,
        result: null,
        error: '请选择 JSON、ZIP 或 DHCB 文件（可多选）',
      })
      return
    }

    void handleMultiFileImport(fileArr)
  }

  const handleMultiFileImport = async (files: File[]) => {
    setImportStatus({ isImporting: true, result: null, error: null })
    const allResults: ImportResultWithFileName[] = []

    for (const file of files) {
      try {
        if (isCardPackageArchiveFileName(file.name)) {
          const dhcbResult = await importDhcbCardPackage(file)
          allResults.push({
            success: true,
            imported: dhcbResult.totalCards,
            errors: dhcbResult.validationErrors,
            warnings: dhcbResult.warnings,
            imageErrors: dhcbResult.imageErrors,
            fileName: file.name,
            batchId: dhcbResult.batchId,
            imageCount: dhcbResult.imageCount,
          })
        } else {
          const text = await file.text()
          const importData: ImportData = JSON.parse(text)
          const result = await importCustomCards(importData, file.name)
          allResults.push({ ...result, fileName: file.name })
        }
      } catch (error) {
        allResults.push(
          isCardPackageArchiveFileName(file.name)
            ? buildFailedDhcbResultHelper(file.name, error)
            : {
                success: false,
                imported: 0,
                errors: [error instanceof Error ? error.message : '文件解析失败'],
                fileName: file.name,
              }
        )
      }
    }

    setImportStatus({
      isImporting: false,
      result: allResults.length === 1 ? allResults[0] : allResults,
      error: getImportStatusErrorMessageHelper(allResults),
    })

    await refreshData()
  }

  const handleDrag = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true)
    } else if (event.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      handleFileSelect(event.dataTransfer.files)
    }
  }

  const handleSingleToggle = async (row: BatchManagementRow) => {
    const success = await setBatchDisabled(row.id, !row.disabled)
    if (!success) {
      alert('切换卡包状态失败')
      return
    }

    await refreshData()
  }

  const handleBulkDisabled = async (disabled: boolean) => {
    const targetRows = selectedRows.filter((row) => row.disabled !== disabled)
    if (targetRows.length === 0) {
      return
    }

    const results = await Promise.all(targetRows.map((row) => setBatchDisabled(row.id, disabled)))
    if (results.some((result) => !result)) {
      alert(disabled ? '部分卡包停用失败' : '部分卡包启用失败')
    }

    await refreshData()
  }

  const openDeleteDialog = (batchIds: string[]) => {
    const removableIds = batchIds.filter((batchId) => {
      const row = batchRows.find((item) => item.id === batchId)
      return !!row && !row.isSystemBatch
    })

    if (removableIds.length === 0) {
      alert('系统内置批次不可删除。')
      return
    }

    setDeleteTargetIds(removableIds)
  }

  const handleConfirmDelete = async () => {
    if (deleteTargetIds.length === 0) {
      return
    }

    const removed = removeBatches(deleteTargetIds)
    if (!removed) {
      alert('删除失败')
      return
    }

    const removedSet = new Set(deleteTargetIds)
    setDeleteTargetIds([])
    setSelectedBatchIds((previous) => new Set([...previous].filter((id) => !removedSet.has(id))))

    if (selectedBatchId && removedSet.has(selectedBatchId)) {
      setSelectedBatchId(null)
      setDetailOpen(false)
    }

    await refreshData()
  }

  const handleClearAll = async () => {
    if (!confirm('确定要清空所有自定义卡牌吗？此操作不可恢复。')) {
      return
    }

    try {
      await clearAllCustomCards()
      setSelectedBatchIds(new Set())
      setSelectedBatchId(null)
      setDetailOpen(false)
      await refreshData()
      alert('所有自定义卡牌已清空')
    } catch (error) {
      alert(`清空失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleClearAllLocalStorage = async () => {
    if (!confirm('⚠️ 危险操作确认 ⚠️\n\n确定要清空本项目的本地数据吗？\n\n这将删除：\n• 所有自定义卡牌\n• 内置卡牌缓存\n• 所有角色数据和角色卡\n• 本项目的公告阅读状态等本地设置\n\n不会删除同源下其他页面的本地数据。\n\n此操作不可恢复！请确保您已备份重要数据。')) {
      return
    }

    const confirmationText = '删除全部本地数据'
    const typedConfirmation = prompt(`此操作会永久删除本项目的角色存档、卡牌数据和相关本地设置。\n\n如确实需要继续，请输入：${confirmationText}`)

    if (typedConfirmation !== confirmationText) {
      alert('已取消强制初始化。')
      return
    }

    try {
      const store = useUnifiedCardStore.getState()
      await store.resetSystem()
      clearProjectLocalStorage()
      await store.initializeSystem()
      await refreshData()

      alert('本项目本地数据已清空！页面将自动刷新。')
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      alert(`清空数据失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const toggleSelect = (batchId: string, checked: boolean) => {
    setSelectedBatchIds((previous) => {
      const next = new Set(previous)
      if (checked) {
        next.add(batchId)
      } else {
        next.delete(batchId)
      }
      return next
    })
  }

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedBatchIds((previous) => {
      const next = new Set(previous)
      paginatedRows.pageRows.forEach((row) => {
        if (checked) {
          next.add(row.id)
        } else {
          next.delete(row.id)
        }
      })
      return next
    })
  }

  const drawerRecentActivity = batchDetail ? getBatchRecentActivity(batchDetail) : null
  const visiblePageNumbers = useMemo<(number | 'ellipsis')[]>(() => {
    const { currentPage, totalPages } = paginatedRows

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    const pages: (number | 'ellipsis')[] = [1]
    const windowStart = Math.max(2, currentPage - 1)
    const windowEnd = Math.min(totalPages - 1, currentPage + 1)

    if (windowStart > 2) {
      pages.push('ellipsis')
    }

    for (let pageNumber = windowStart; pageNumber <= windowEnd; pageNumber += 1) {
      pages.push(pageNumber)
    }

    if (windowEnd < totalPages - 1) {
      pages.push('ellipsis')
    }

    pages.push(totalPages)

    return pages.filter((item, index, array) => item !== 'ellipsis' || array[index - 1] !== 'ellipsis')
  }, [paginatedRows])

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-[1580px] rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5 xl:p-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-5">
            <Card className="rounded-lg border border-slate-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Upload className="h-5 w-5 text-slate-700" />
                  卡牌导入
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`rounded-lg border border-dashed px-6 py-9 text-center transition ${dragActive ? 'border-slate-400 bg-slate-100' : 'border-slate-300 bg-slate-50 hover:border-slate-400'} ${importStatus.isImporting ? 'pointer-events-none opacity-60' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
                    <Upload className="h-7 w-7" />
                  </div>
                  <p className="mt-5 text-base font-semibold text-slate-900">拖拽文件到此处</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">支持 JSON / ZIP / DHCB，点击下方按钮也可以直接上传。</p>
                  <Button
                    className="mt-5 rounded-md border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    variant="outline"
                    onClick={openSystemFilePicker}
                    disabled={importStatus.isImporting}
                  >
                    选择文件
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={CARD_PACKAGE_IMPORT_ACCEPT}
                    onChange={(event) => handleFileSelect(event.target.files)}
                    className="hidden"
                    multiple
                  />
                </div>

                {importStatus.isImporting && (
                  <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    正在导入卡包...
                  </div>
                )}

                {Array.isArray(importStatus.result) ? (
                  <div className="space-y-2">
                    {importStatus.result.map((result, index) => renderImportResultCard(result, index))}
                  </div>
                ) : (
                  importStatus.result && renderImportResultCard(importStatus.result, 'single-result')
                )}

                {importStatus.error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    {importStatus.error}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-slate-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <HardDrive className="h-5 w-5 text-slate-700" />
                  存储使用情况
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <StorageUsageDial percent={storageInfo.usagePercent} />
                  <div className="min-w-0 flex-1 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">已使用</span>
                      <span className="font-mono text-slate-800">{storageInfo.used}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">总容量</span>
                      <span className="font-mono text-slate-800">{storageInfo.total}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">剩余空间</span>
                      <span className="font-mono text-slate-800">{storageInfo.available}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-red-200 bg-red-50/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl text-red-600">
                  <ShieldAlert className="h-5 w-5" />
                  强制初始化
                </CardTitle>
                <CardDescription className="leading-6 text-red-500/80">
                  彻底重置所有本地数据，包括卡牌、角色与本页面设置。操作不可逆，请谨慎执行。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="destructive" className="h-11 w-full rounded-lg" onClick={handleClearAllLocalStorage}>
                  强制初始化所有数据
                </Button>
                <p className="text-xs text-red-500/80">此操作不会恢复历史存档，建议先导出或手动备份重要数据。</p>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
            <CardContent className="space-y-5 p-4 md:p-5 xl:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <h1 className="text-[2rem] font-semibold tracking-tight text-slate-900">卡包管理</h1>
                  <p className="mt-2 text-sm text-slate-500">
                    支持搜索、筛选、批量启停和详情抽屉。当前共显示 {filteredRows.length} 个结果。
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" className="rounded-md" onClick={() => setDocumentModalOpen(true)}>
                      <BookOpen className="h-4 w-4" />
                      高级卡包创作指南
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-md" onClick={() => navigateToPage('/card-editor')}>
                      <Edit3 className="h-4 w-4" />
                      卡包编辑器
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-md" onClick={() => handleViewCards()}>
                      <Eye className="h-4 w-4" />
                      查看全部卡牌
                      <Badge variant="secondary" className="ml-1 rounded-full px-2">{allCardsCount}</Badge>
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-md" onClick={() => refreshData()}>
                      <RefreshCw className="h-4 w-4" />
                      刷新
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-md" onClick={goBackToMain}>
                      <Home className="h-4 w-4" />
                      返回主站
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col items-stretch gap-3 xl:items-end">
                  <Button
                    onClick={openSystemFilePicker}
                    className="h-11 rounded-lg px-5"
                  >
                    <Upload className="h-4 w-4" />
                    导入卡包
                  </Button>
                  <label className="flex items-center justify-end gap-2 text-sm text-slate-500">
                    <Checkbox
                      id="autoRefresh"
                      checked={autoRefresh}
                      onCheckedChange={(checked) => setAutoRefresh(checked === true)}
                    />
                    每 5 秒自动刷新
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
                <BatchMetricCard
                  icon={Package}
                  label="全部卡包"
                  value={summaryStats.all}
                  hint="已纳入管理"
                  accent="slate"
                  active={filters.status === 'all'}
                  onClick={() => setFilters((previous) => ({ ...previous, status: 'all' }))}
                />
                <BatchMetricCard
                  icon={CheckCircle2}
                  label="已启用"
                  value={summaryStats.enabled}
                  hint="当前可用"
                  accent="green"
                  active={filters.status === 'enabled'}
                  onClick={() => setFilters((previous) => ({ ...previous, status: 'enabled' }))}
                />
                <BatchMetricCard
                  icon={PenSquare}
                  label="自定义"
                  value={summaryStats.custom}
                  hint="非系统内置"
                  accent="blue"
                  active={filters.type === 'custom'}
                  onClick={() => setFilters((previous) => ({ ...previous, type: previous.type === 'custom' ? 'all' : 'custom' }))}
                />
                <BatchMetricCard
                  icon={TriangleAlert}
                  label="异常"
                  value={summaryStats.abnormal}
                  hint="告警与完整性问题"
                  accent="red"
                  active={filters.status === 'abnormal'}
                  onClick={() => setFilters((previous) => ({ ...previous, status: 'abnormal' }))}
                />
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={filters.search}
                    onChange={(event) => setFilters((previous) => ({ ...previous, search: event.target.value }))}
                    className="h-11 rounded-lg border-slate-200 bg-white pl-11 shadow-sm"
                    placeholder="搜索卡包名称 / 文件名 / 批次 ID"
                  />
                </div>

                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Select value={filters.status} onValueChange={(value) => setFilters((previous) => ({ ...previous, status: value as BatchFilterState['status'] }))}>
                      <SelectTrigger className="h-10 min-w-[124px] rounded-md border-slate-200 bg-white">
                        <SelectValue placeholder="状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{STATUS_LABELS.all}</SelectItem>
                        <SelectItem value="enabled">{STATUS_LABELS.enabled}</SelectItem>
                        <SelectItem value="disabled">{STATUS_LABELS.disabled}</SelectItem>
                        <SelectItem value="abnormal">{STATUS_LABELS.abnormal}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filters.type} onValueChange={(value) => setFilters((previous) => ({ ...previous, type: value as BatchFilterState['type'] }))}>
                      <SelectTrigger className="h-10 min-w-[124px] rounded-md border-slate-200 bg-white">
                        <SelectValue placeholder="类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部类型</SelectItem>
                        <SelectItem value="system">系统内置</SelectItem>
                        <SelectItem value="custom">自定义</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filters.source} onValueChange={(value) => setFilters((previous) => ({ ...previous, source: value as BatchFilterState['source'] }))}>
                      <SelectTrigger className="h-10 min-w-[124px] rounded-md border-slate-200 bg-white">
                        <SelectValue placeholder="来源" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部来源</SelectItem>
                        <SelectItem value="builtin">{SOURCE_LABELS.builtin}</SelectItem>
                        <SelectItem value="json">{SOURCE_LABELS.json}</SelectItem>
                        <SelectItem value="archive">{SOURCE_LABELS.archive}</SelectItem>
                        <SelectItem value="unknown">{SOURCE_LABELS.unknown}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={`${sort.key}:${sort.direction}`}
                      onValueChange={(value) => {
                        const [key, direction] = value.split(':') as [BatchSortState['key'], BatchSortState['direction']]
                        setSort({ key, direction })
                      }}
                    >
                      <SelectTrigger className="h-10 min-w-[172px] rounded-md border-slate-200 bg-white">
                        <SelectValue placeholder="排序" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="importTime:desc">排序：导入时间 ↓</SelectItem>
                        <SelectItem value="importTime:asc">排序：导入时间 ↑</SelectItem>
                        <SelectItem value="cardCount:desc">排序：卡牌数 ↓</SelectItem>
                        <SelectItem value="cardCount:asc">排序：卡牌数 ↑</SelectItem>
                        <SelectItem value="name:asc">排序：名称 A-Z</SelectItem>
                        <SelectItem value="name:desc">排序：名称 Z-A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 self-start rounded-md border border-slate-200 bg-slate-50 p-1">
                    <Button
                      size="sm"
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      className={viewMode === 'list' ? 'rounded-md bg-white text-slate-900 shadow-sm hover:bg-white' : 'rounded-md text-slate-500 hover:text-slate-700'}
                      onClick={() => setViewMode('list')}
                    >
                      <LayoutList className="h-4 w-4" />
                      列表视图
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === 'grouped' ? 'default' : 'ghost'}
                      className={viewMode === 'grouped' ? 'rounded-md bg-white text-slate-900 shadow-sm hover:bg-white' : 'rounded-md text-slate-500 hover:text-slate-700'}
                      onClick={() => setViewMode('grouped')}
                    >
                      <Layers3 className="h-4 w-4" />
                      分组视图
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={(checked) => toggleSelectAllVisible(checked === true)}
                    aria-label="选择当前页全部批次"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">批量操作</p>
                    <p className="text-xs text-slate-500">当前已选择 {selectedRows.length} 个批次</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-md border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50"
                    onClick={() => handleBulkDisabled(false)}
                    disabled={selectedRows.length === 0}
                  >
                    <Power className="h-4 w-4" />
                    批量启用
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-md border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    onClick={() => handleBulkDisabled(true)}
                    disabled={selectedRows.length === 0}
                  >
                    <PowerOff className="h-4 w-4" />
                    批量停用
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-md border-red-200 bg-white text-red-500 hover:bg-red-50"
                    onClick={() => openDeleteDialog([...selectedBatchIds])}
                    disabled={selectedRemovableRows.length === 0}
                  >
                    <Trash2 className="h-4 w-4" />
                    批量删除
                  </Button>
                </div>
              </div>

              {filteredRows.length === 0 ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center">
                  <FileText className="mb-4 h-12 w-12 text-slate-400" />
                  <p className="text-lg font-medium text-slate-900">暂无匹配的卡包</p>
                  <p className="mt-2 text-sm text-slate-500">调整搜索与筛选条件，或先导入新的卡包。</p>
                </div>
              ) : viewMode === 'list' ? (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-12 border-slate-200 bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="w-12" />
                        <TableHead>卡包名称</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-center">卡牌数</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>来源 / 文件名</TableHead>
                        <TableHead>导入时间</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRows.pageRows.map((row) => {
                        const rowTypeTokens = row.cardTypes.slice(0, 2)
                        const rowTypeOverflow = Math.max(0, row.cardTypes.length - rowTypeTokens.length)

                        return (
                          <TableRow
                            key={row.id}
                            className={`cursor-pointer border-slate-100 transition hover:bg-slate-50 ${selectedBatchIds.has(row.id) ? 'bg-slate-100' : 'bg-white'}`}
                            onClick={() => openBatchDetail(row.id)}
                          >
                            <TableCell className="align-middle" onClick={(event) => event.stopPropagation()}>
                              <Checkbox
                                checked={selectedBatchIds.has(row.id)}
                                onCheckedChange={(checked) => toggleSelect(row.id, checked === true)}
                                aria-label={`选择批次 ${row.name}`}
                              />
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-slate-900">{row.name}</span>
                                  {row.isSystemBatch && <Badge variant="outline" className="rounded-full px-2 text-[11px]">系统</Badge>}
                                </div>
                                <code className="block truncate text-[11px] text-slate-400">{row.id}</code>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <StatusPill row={row} />
                            </TableCell>
                            <TableCell className="py-4 text-center text-sm font-medium text-slate-800">{row.cardCount}</TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-wrap gap-1.5">
                                {rowTypeTokens.length > 0 ? (
                                  rowTypeTokens.map((token) => (
                                    <Badge key={`${row.id}-${token}`} variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-2 text-[11px] font-normal text-slate-600">
                                      {token}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-2 text-[11px] font-normal text-slate-500">
                                    未识别
                                  </Badge>
                                )}
                                {rowTypeOverflow > 0 && (
                                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-2 text-[11px] font-normal text-slate-600">
                                    +{rowTypeOverflow}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="space-y-1">
                                <p className="text-sm text-slate-700">{SOURCE_LABELS[row.sourceKind]}</p>
                                <p className="max-w-[260px] truncate text-xs text-slate-400">{row.fileName}</p>
                              </div>
                            </TableCell>
                            <TableCell className="py-4 text-sm text-slate-500">{new Date(row.importTime).toLocaleString()}</TableCell>
                            <TableCell className="py-4" onClick={(event) => event.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                  onClick={() => openBatchDetail(row.id)}
                                  title="查看详情"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                  onClick={() => handleSingleToggle(row)}
                                  title={row.disabled ? '启用' : '停用'}
                                >
                                  {row.disabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-full text-red-400 hover:bg-red-50 hover:text-red-500"
                                  disabled={row.isSystemBatch}
                                  onClick={() => openDeleteDialog([row.id])}
                                  title={row.isSystemBatch ? '系统批次不可删除' : '删除'}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedRows.map((group) => (
                    <div key={group.sourceKind} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-slate-900">{group.label}</h3>
                          <p className="text-xs text-slate-500">当前页共 {group.rows.length} 个批次</p>
                        </div>
                        <Badge variant="secondary" className="rounded-full px-2.5">{group.rows.length}</Badge>
                      </div>
                      <div className="space-y-3">
                        {group.rows.map((row) => (
                          <div
                            key={row.id}
                            className={`cursor-pointer rounded-lg border p-4 transition hover:border-slate-300 ${selectedBatchIds.has(row.id) ? 'border-slate-400 bg-slate-100' : 'border-slate-200 bg-white'}`}
                            onClick={() => openBatchDetail(row.id)}
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={selectedBatchIds.has(row.id)}
                                  onCheckedChange={(checked) => toggleSelect(row.id, checked === true)}
                                  onClick={(event) => event.stopPropagation()}
                                  aria-label={`选择批次 ${row.name}`}
                                />
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium text-slate-900">{row.name}</span>
                                    <StatusPill row={row} />
                                    {row.isSystemBatch && <Badge variant="outline" className="rounded-full px-2 text-[11px]">系统</Badge>}
                                  </div>
                                  <p className="text-sm text-slate-500">{row.fileName}</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {row.cardTypes.length > 0 ? (
                                      row.cardTypes.slice(0, 3).map((token) => (
                                        <Badge key={`${row.id}-${token}`} variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-2 text-[11px] font-normal text-slate-600">
                                          {token}
                                        </Badge>
                                      ))
                                    ) : (
                                      <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-2 text-[11px] font-normal text-slate-500">
                                        未识别
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm text-slate-500 lg:min-w-[280px]">
                                <div>
                                  <span className="block text-xs uppercase tracking-wide text-slate-400">卡牌数</span>
                                  <span className="font-medium text-slate-900">{row.cardCount}</span>
                                </div>
                                <div>
                                  <span className="block text-xs uppercase tracking-wide text-slate-400">来源</span>
                                  <span className="font-medium text-slate-900">{SOURCE_LABELS[row.sourceKind]}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="block text-xs uppercase tracking-wide text-slate-400">导入时间</span>
                                  <span className="font-medium text-slate-900">{new Date(row.importTime).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>每页</span>
                  <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                    <SelectTrigger className="h-9 w-[88px] rounded-md border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-md"
                    onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                    disabled={paginatedRows.currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {visiblePageNumbers.map((pageNumber, index) =>
                    pageNumber === 'ellipsis' ? (
                      <span key={`ellipsis-${index}`} className="px-1 text-sm text-slate-400">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={pageNumber}
                        variant={pageNumber === paginatedRows.currentPage ? 'default' : 'outline'}
                        size="icon"
                        className={pageNumber === paginatedRows.currentPage ? 'h-9 w-9 rounded-md bg-primary text-primary-foreground hover:bg-primary/90' : 'h-9 w-9 rounded-md'}
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </Button>
                    )
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-md"
                    onClick={() => setPage((previous) => Math.min(paginatedRows.totalPages, previous + 1))}
                    disabled={paginatedRows.currentPage >= paginatedRows.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button variant="outline" className="rounded-md border-red-200 text-red-500 hover:bg-red-50" onClick={handleClearAll}>
                    清空所有自定义卡牌
                  </Button>
                  <span className="text-sm font-medium text-slate-600">共 {filteredRows.length} 条</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-md"
                    onClick={() => refreshData()}
                    title="刷新数据"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="w-full overflow-hidden p-0 sm:max-w-2xl">
          {batchDetail ? (
            <>
              <SheetHeader className="border-b bg-slate-50 px-6 py-5">
                <div className="flex items-start justify-between gap-4 pr-8">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <SheetTitle>{batchDetail.name}</SheetTitle>
                      <Badge variant={getBatchStatusTag(batchDetail).tone}>{getBatchStatusTag(batchDetail).label}</Badge>
                      <Badge variant="outline">{SOURCE_LABELS[batchDetail.sourceKind]}</Badge>
                    </div>
                    <SheetDescription>
                      {batchDetail.fileName} · 批次 ID: {batchDetail.id}
                    </SheetDescription>
                  </div>
                  <Button variant="outline" onClick={() => handleViewCards(batchDetail.id)}>
                    <Eye className="h-4 w-4" />
                    查看全部卡牌
                  </Button>
                </div>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex h-[calc(100vh-88px)] flex-col">
                <div className="border-b px-6 py-3">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview">概览</TabsTrigger>
                    <TabsTrigger value="config">配置</TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="flex-1">
                  <TabsContent value="overview" className="space-y-6 px-6 py-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">基础信息</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div className="flex justify-between gap-4"><span className="text-slate-500">卡牌数量</span><span>{batchDetail.cardCount}</span></div>
                          <div className="flex justify-between gap-4"><span className="text-slate-500">导入时间</span><span>{new Date(batchDetail.importTime).toLocaleString()}</span></div>
                          <div className="flex justify-between gap-4"><span className="text-slate-500">最后更新时间</span><span>{new Date(batchDetail.lastUpdatedAt).toLocaleString()}</span></div>
                          <div className="flex justify-between gap-4"><span className="text-slate-500">来源</span><span>{SOURCE_LABELS[batchDetail.sourceKind]}</span></div>
                          <div className="flex justify-between gap-4"><span className="text-slate-500">类型标签</span><span>{formatBatchTypeSummary(batchDetail)}</span></div>
                          <div className="flex justify-between gap-4"><span className="text-slate-500">图片数量</span><span>{batchDetail.imageCount}</span></div>
                          <div className="flex justify-between gap-4"><span className="text-slate-500">存储占用</span><span>{formatBytes(batchDetail.storageSize)}</span></div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">说明与提示</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div>
                            <p className="text-slate-500">描述</p>
                            <p className="mt-1 text-slate-900">{batchDetail.description || '暂无描述'}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">作者</p>
                            <p className="mt-1 text-slate-900">{batchDetail.author || '未提供'}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">健康提示</p>
                            {batchDetail.healthMessages.length > 0 ? (
                              <ul className="mt-2 space-y-2 text-slate-900">
                                {batchDetail.healthMessages.map((message, index) => (
                                  <li key={`${batchDetail.id}-health-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                                    {message}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-1 text-slate-900">无异常提示</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">最近操作时间线</CardTitle>
                        <CardDescription>最近一次操作时间：{drawerRecentActivity ? new Date(drawerRecentActivity).toLocaleString() : '暂无'}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {batchDetail.activityLog.map((entry, index) => (
                          <div key={`${entry.type}-${entry.at}-${index}`} className="rounded-md border border-slate-200 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-medium text-slate-900">{entry.summary}</span>
                              <span className="text-xs text-slate-500">{new Date(entry.at).toLocaleString()}</span>
                            </div>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{entry.type}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="config" className="space-y-6 px-6 py-5">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">只读配置</CardTitle>
                        <CardDescription>本版保留配置信息展示，但不开放在线编辑。</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between gap-4"><span className="text-slate-500">批次类型</span><span>{batchDetail.isSystemBatch ? '系统内置' : '自定义卡包'}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-slate-500">启用状态</span><span>{batchDetail.disabled ? '未启用' : '已启用'}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-slate-500">自定义字段</span><span>{batchDetail.hasCustomFields ? '存在' : '无'}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-slate-500">Variant 配置</span><span>{batchDetail.hasVariantTypes ? '存在' : '无'}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-slate-500">图片数</span><span>{batchDetail.imageCount}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-slate-500">图片占用</span><span>{formatBytes(batchDetail.totalImageSize)}</span></div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">
              未找到对应批次详情。
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={deleteTargetIds.length > 0} onOpenChange={(open) => !open && setDeleteTargetIds([])}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              {deleteTargetIds.length === 1
                ? '该卡包及其卡牌数据将被永久删除，且不可恢复。'
                : `将永久删除 ${deleteTargetIds.length} 个卡包及其卡牌数据，且不可恢复。`}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            系统内置批次不会进入删除列表；只有当前确认的自定义批次会被移除。
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTargetIds([])}>取消</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ViewCardsModal
        cards={viewingCards}
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={viewingTitle}
      />

      <DocumentModal
        isOpen={documentModalOpen}
        onClose={() => setDocumentModalOpen(false)}
        userGuideContent={userGuideContent}
        aiGuideContent={aiGuideContent}
        exampleJsonContent={exampleJsonContent}
      />
    </div>
  )
}
