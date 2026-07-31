"use client"

import { useDeferredValue, useEffect, useMemo } from "react"
import { useUnifiedCardStore, CardType } from "@/card/stores/unified-card-store"
import { useCardFilterStore } from "@/lib/card-filter-store"
import type { ExtendedStandardCard } from "@/card/card-types"
import { isVariantType, CARD_LEVEL_OPTIONS } from "@/card/card-types"
import { cardBelongsToRuleSet } from "@/lib/ruleset"
import { useSheetStore } from "@/lib/sheet-store"
import { getRuleSetBatchOptions } from "@/lib/ruleset-card-batches"
import { getRhodesDomainFilterOptions } from "@/lib/rhodes-domain-filter"

/**
 * 筛选状态
 */
interface FilterState {
  activeTab: string
  selectedBatches: string[]
  selectedClasses: string[]
  selectedLevels: string[]
  searchTerm: string
}

/**
 * 筛选操作
 */
interface FilterActions {
  setActiveTab: (tab: string) => void
  setBatches: (batches: string[]) => void
  setClasses: (classes: string[]) => void
  setLevels: (levels: string[]) => void
  setSearchTerm: (term: string) => void
  resetAll: () => void
}

/**
 * Hook 返回值
 */
interface UseCardFilteringReturn {
  // 筛选结果
  filteredCards: ExtendedStandardCard[]
  totalCount: number

  // 动态选项（基于当前筛选条件）
  classOptions: Array<{ value: string; label: string; separatorBefore?: string }>
  levelOptions: Array<{ value: string; label: string }>
  batchOptions: Array<{ id: string; name: string; cardCount: number }>

  // 状态和操作
  state: FilterState
  actions: FilterActions

  // 加载状态
  loading: boolean
  error: string | null
}

/**
 * 简化的卡牌筛选 Hook
 *
 * 设计原则：
 * 1. 使用 Zustand store 持久化状态 - 组件卸载后状态不丢失
 * 2. 智能联动内置 - Tab/卡包变更时自动重置相关筛选
 * 3. 管道式过滤 - 按顺序执行：类型 → 卡包 → 类别 → 等级 → 搜索
 * 4. 动态选项计算 - 从过滤后的卡牌中提取类别/等级选项
 * 5. 支持多入口 - 通过 syncWithInitialTab 处理不同入口的 initialTab
 */
export function useCardFiltering(initialTab?: string, enabled = true): UseCardFilteringReturn {
  const initialized = useUnifiedCardStore((store) => store.initialized)
  const loading = useUnifiedCardStore((store) => store.loading)
  const error = useUnifiedCardStore((store) => store.error)
  const cards = useUnifiedCardStore((store) => store.cards)
  const batches = useUnifiedCardStore((store) => store.batches)
  const cardsByType = useUnifiedCardStore((store) => store.cardsByType)
  const activeTab = useCardFilterStore((store) => store.activeTab)
  const selectedBatches = useCardFilterStore((store) => store.selectedBatches)
  const selectedClasses = useCardFilterStore((store) => store.selectedClasses)
  const selectedLevels = useCardFilterStore((store) => store.selectedLevels)
  const searchTerm = useCardFilterStore((store) => store.searchTerm)
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const ruleSetId = useSheetStore(state => state.sheetData.ruleSetId)

  // === 同步 initialTab ===
  // 当 initialTab 与当前 activeTab 不同时，重置到 initialTab
  // 这样可以支持不同入口（card-deck、upgrade domain、upgrade subclass）
  // 使用 getState() 获取稳定的函数引用，避免无限循环
  useEffect(() => {
    if (enabled) {
      useCardFilterStore.getState().syncWithInitialTab(initialTab)
    }
  }, [enabled, initialTab])

  // === 从 store 获取状态 ===
  const state: FilterState = {
    activeTab,
    selectedBatches,
    selectedClasses,
    selectedLevels,
    searchTerm,
  }

  // === 从 store 获取操作 ===
  const setActiveTab = useCardFilterStore((store) => store.setActiveTab)
  const setBatches = useCardFilterStore((store) => store.setBatches)
  const setClasses = useCardFilterStore((store) => store.setClasses)
  const setLevels = useCardFilterStore((store) => store.setLevels)
  const setSearchTerm = useCardFilterStore((store) => store.setSearchTerm)
  const resetAll = useCardFilterStore((store) => store.resetAll)
  const actions: FilterActions = useMemo(() => ({
    setActiveTab,
    setBatches,
    setClasses,
    setLevels,
    setSearchTerm,
    resetAll,
  }), [resetAll, setActiveTab, setBatches, setClasses, setLevels, setSearchTerm])

  // === 基础卡牌（按类型） ===
  const baseCards = useMemo(() => {
    if (!initialized) return []

    const isVariant = isVariantType(state.activeTab)
    const targetType = isVariant ? CardType.Variant : (state.activeTab as CardType)
    const typeCards = useUnifiedCardStore.getState().loadCardsByType(targetType)
      .filter(card => cardBelongsToRuleSet(card, ruleSetId))

    // 如果是变体类型，需要进一步筛选 realType
    if (isVariant) {
      return typeCards.filter(card =>
        card.variantSpecial?.realType === state.activeTab
      )
    }

    return typeCards
  }, [cards, cardsByType, initialized, state.activeTab, ruleSetId])

  // === 卡包过滤后的卡牌（用于计算选项） ===
  const batchFilteredCards = useMemo(() => {
    if (state.selectedBatches.length === 0) return baseCards
    const batchSet = new Set(state.selectedBatches)
    return baseCards.filter(c => c.batchId && batchSet.has(c.batchId))
  }, [baseCards, state.selectedBatches])

  // === 动态选项（从卡包过滤后的卡牌中提取） ===
  const { classOptions, levelOptions } = useMemo(() => {
    const classes = new Set<string>()
    const levels = new Set<string>()

    for (const card of batchFilteredCards) {
      if (card.class) classes.add(card.class)
      if (card.level != null) levels.add(String(card.level))
    }

    // 获取当前卡牌类型的等级选项配置
    const currentCardType = state.activeTab as CardType
    const levelLabels = (CARD_LEVEL_OPTIONS as Record<string, string[]>)[currentCardType] || []

    const classOptions = ruleSetId === "rhodes-island" && state.activeTab === CardType.Domain
      ? getRhodesDomainFilterOptions(classes)
      : Array.from(classes)
        .sort()
        .map(c => ({ value: c, label: c }))

    return {
      classOptions,
      levelOptions: Array.from(levels)
        .sort((a, b) => Number(a) - Number(b))
        .map(l => {
          const levelNum = Number(l)
          // 如果有自定义等级标签，使用自定义标签（level 作为索引，从 1 开始）
          const customLabel = levelLabels.length > 0 && levelLabels[levelNum - 1]
          return {
            value: l,
            label: customLabel || `${l}级`
          }
        }),
    }
  }, [batchFilteredCards, state.activeTab, ruleSetId])

  // === 完整筛选（管道式） ===
  const filteredCards = useMemo(() => {
    let result = batchFilteredCards

    // Step 1: 类别筛选
    if (state.selectedClasses.length > 0) {
      const classSet = new Set(state.selectedClasses)
      result = result.filter(c => c.class && classSet.has(c.class))
    }

    // Step 2: 等级筛选
    if (state.selectedLevels.length > 0) {
      const levelSet = new Set(state.selectedLevels)
      result = result.filter(c => c.level != null && levelSet.has(String(c.level)))
    }

    // Step 3: 搜索筛选
    if (deferredSearchTerm) {
      const term = deferredSearchTerm.toLowerCase()
      result = result.filter(c =>
        c.name?.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term) ||
        c.cardSelectDisplay?.item1?.toLowerCase().includes(term) ||
        c.cardSelectDisplay?.item2?.toLowerCase().includes(term) ||
        c.cardSelectDisplay?.item3?.toLowerCase().includes(term)
      )
    }

    return result
  }, [batchFilteredCards, deferredSearchTerm, state.selectedClasses, state.selectedLevels])

  // === 卡包选项（静态，不依赖筛选） ===
  const batchOptions = useMemo(() => {
    // getAllBatches 返回的是扩展类型，包含 id 和 name
    const allBatches = useUnifiedCardStore.getState().getAllBatches() as unknown as Array<{
      id: string
      name: string
      cardCount: number
    }>
    const options = allBatches.map(b => ({
      id: b.id,
      name: b.name,
      cardCount: b.cardCount,
    }))
    return getRuleSetBatchOptions(
      options,
      useUnifiedCardStore.getState().loadAllCards(),
      ruleSetId,
    )
  }, [batches, cards, initialized, ruleSetId])

  // 切换规则集时清除在当前规则下不可见的历史卡包筛选。
  useEffect(() => {
    const allowedIds = new Set(batchOptions.map(batch => batch.id))
    const validSelection = state.selectedBatches.filter(id => allowedIds.has(id))
    if (validSelection.length !== state.selectedBatches.length) {
      useCardFilterStore.getState().setBatches(validSelection)
    }
  }, [batchOptions, state.selectedBatches])

  return {
    filteredCards,
    totalCount: filteredCards.length,
    classOptions,
    levelOptions,
    batchOptions,
    state,
    actions,
    loading,
    error,
  }
}
