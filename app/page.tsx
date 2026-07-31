"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import CharacterSheet from "@/components/character-sheet"
import CharacterSheetPageTwo from "@/components/character-sheet-page-two"
import CharacterSheetPageThree from "@/components/character-sheet-page-ranger-companion"
import CharacterSheetPageAdventureNotes from "@/components/character-sheet-page-adventure-notes"
import CharacterSheetPageRhodesRelationships from "@/components/character-sheet-page-rhodes-relationships"
import { isEmptyCard, type StandardCard } from "@/card/card-types"
import { CardDrawer } from "@/components/card-drawer"
import { showFadeNotification } from "@/components/ui/fade-notification"
import { confirm, promptDialog } from "@/components/ui/confirm-dialog"
import { CardSelectionModal } from "@/components/modals/card-selection-modal"
import { CharacterSheetPageFour, CharacterSheetPageFive } from "@/components/character-sheet-page-card-print"
import ArmorTemplatePage from "@/components/character-sheet-page-iknis"
import { useSheetStore, useCardActions } from "@/lib/sheet-store"
import { useShallow } from "zustand/react/shallow"
import { PrintReadyChecker } from "@/components/print/print-ready-checker"
import { PrintProvider } from "@/contexts/print-context"
import { ExportPreviewShell } from "@/components/print/export-preview-shell"
import { usePinnedCardsStore } from "@/lib/pinned-cards-store"
import { PinnedCardWindow } from "@/components/ui/pinned-card-window"
import { useTextModeStore } from "@/lib/text-mode-store"
import { useDualPageStore } from "@/lib/dual-page-store"
import { registerPages, getTabPages } from "@/lib/page-registry"
import { PageDisplay } from "@/components/layout/page-display"
import { BottomDock } from "@/components/layout/bottom-dock"
import { PrintPageRenderer } from "@/components/print/print-page-renderer"
import { SaveSwitcher } from "@/components/ui/save-switcher"
import { Button } from "@/components/ui/button"
import { AnnouncementModal } from "@/components/modals/announcement-modal"
import { useAnnouncementStore } from "@/lib/announcement-store"
import { getAnnouncements } from "@/lib/announcements"
import { getLatestAnnouncementId } from "@/lib/announcement-index"
import {
  clearOfficialImagePackData,
  importOfficialImagePack,
  type OfficialImagePackImportProgress,
} from "@/lib/official-image-pack"
import { useOfficialImagePackStore } from "@/lib/official-image-pack-store"
import { CardSystemInitializer } from "@/components/card-system-initializer"
import { RULE_SET_LABELS } from "@/lib/ruleset"
import { validateJSONCharacterData } from "@/lib/character-data-validator"
import { defaultSheetData } from "@/lib/default-sheet-data"

// EyeIcon和EyeOffIcon已移除 - 现在使用PageVisibilityDropdown

// 文字模式图标
const TextIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="4 7 4 4 20 4 20 7"></polyline>
    <line x1="9" y1="20" x2="15" y2="20"></line>
    <line x1="12" y1="4" x2="12" y2="20"></line>
  </svg>
)

// 图片模式图标
const ImageIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
)

function getOfficialImagePackProgressView(progress: OfficialImagePackImportProgress) {
  const ratio = progress.total > 0 ? progress.processed / progress.total : 0

  switch (progress.phase) {
    case "loading-zip":
      return {
        label: "正在读取压缩包",
        detail: "准备解压导入文件",
        percent: 8,
      }
    case "validating":
      return {
        label: "正在校验卡图包",
        detail: "检查 manifest 和图片目录",
        percent: 18,
      }
    case "extracting-images":
      return {
        label: "正在解压图片",
        detail:
          progress.total > 0
            ? `${progress.processed} / ${progress.total} 张`
            : "正在提取图片资源",
        percent: Math.round(18 + ratio * 52),
      }
    case "writing-images":
      return {
        label: "正在写入本地缓存",
        detail:
          progress.total > 0
            ? `${progress.processed} / ${progress.total} 张`
            : "正在写入 IndexedDB",
        percent: Math.round(70 + ratio * 26),
      }
    case "finalizing":
      return {
        label: "正在完成导入",
        detail: "马上就好",
        percent: 100,
      }
    default:
      return {
        label: "正在导入卡图",
        detail: "请稍候",
        percent: progress.percent,
      }
  }
}

import { useCharacterManagement } from "@/hooks/use-character-management"
import { useExportHandlers } from "@/hooks/use-export-handlers"
import { useSheetAutoSave } from "@/hooks/use-sheet-auto-save"
import PrintHelper from "./print-helper"

const CharacterCreationGuide = dynamic(
  () =>
    import("@/components/guide/character-creation-guide").then(
      (mod) => mod.CharacterCreationGuide,
    ),
  { ssr: false },
)

const loadCharacterManagementModal = () =>
  import("@/components/modals/character-management-modal")
const loadCharacterCodeExportModal = () =>
  import("@/components/modals/character-code-export-modal")
const loadSealDiceExportModal = () =>
  import("@/components/modals/seal-dice-export-modal")

function DeferredModalSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="h-24 w-72 animate-pulse rounded-xl border border-slate-200 bg-white/95 shadow-xl" />
    </div>
  )
}

const CharacterManagementModal = dynamic(
  () =>
    loadCharacterManagementModal().then(
      (mod) => mod.CharacterManagementModal,
    ),
  { ssr: false, loading: DeferredModalSkeleton },
)
const CharacterCodeExportModal = dynamic(
  () =>
    loadCharacterCodeExportModal().then(
      (mod) => mod.CharacterCodeExportModal,
    ),
  { ssr: false, loading: DeferredModalSkeleton },
)
const SealDiceExportModal = dynamic(
  () =>
    loadSealDiceExportModal().then(
      (mod) => mod.SealDiceExportModal,
    ),
  { ssr: false, loading: DeferredModalSkeleton },
)
const FloatingNotebook = dynamic(
  () => import("@/components/notebook").then((mod) => mod.FloatingNotebook),
  { ssr: false, loading: () => null },
)

function StoreConnectedPrintPageRenderer() {
  const sheetData = useSheetStore((state) => state.sheetData)
  return <PrintPageRenderer sheetData={sheetData} />
}

function StoreConnectedSealDiceExportModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const sheetData = useSheetStore((state) => state.sheetData)
  return (
    <SealDiceExportModal
      isOpen={isOpen}
      onClose={onClose}
      sheetData={sheetData}
    />
  )
}

function StoreConnectedCardDrawer({
  isOpen,
  onClose,
  onDeleteCard,
  onMoveCard,
  onAddCard,
  isModalOpen,
}: {
  isOpen: boolean
  onClose: () => void
  onDeleteCard: (cardIndex: number, isInventory: boolean) => void
  onMoveCard: (cardIndex: number, fromInventory: boolean, toInventory: boolean) => void
  onAddCard: (index: number, isInventory: boolean) => void
  isModalOpen: boolean
}) {
  const { cards, inventoryCards } = useSheetStore(useShallow((state) => ({
    cards: state.sheetData.cards,
    inventoryCards: state.sheetData.inventory_cards,
  })))

  return (
    <CardDrawer
      cards={cards || []}
      inventoryCards={inventoryCards || []}
      isOpen={isOpen}
      onClose={onClose}
      onDeleteCard={onDeleteCard}
      onMoveCard={onMoveCard}
      onAddCard={onAddCard}
      isModalOpen={isModalOpen}
    />
  )
}

// 注册所有页面
registerPages([
  {
    id: 'page1',
    label: '第一页',
    component: CharacterSheet,
    printClass: 'page-one',
    visibility: { type: 'always' },
    printOrder: 1,
    showInTabs: true
  },
  {
    id: 'page2',
    label: '第二页',
    component: CharacterSheetPageTwo,
    printClass: 'page-two',
    visibility: { type: 'always' },
    printOrder: 2,
    showInTabs: true
  },
  {
    id: 'rhodes-relationships',
    label: '关系与问题',
    component: CharacterSheetPageRhodesRelationships,
    printClass: 'page-rhodes-relationships',
    visibility: {
      type: 'data',
      dataCheck: (data) =>
        data.ruleSetId === 'rhodes-island' &&
        !!data.pageVisibility?.relationshipQuestions
    },
    printOrder: 3,
    showInTabs: true
  },
  {
    id: 'page3',
    label: '游侠伙伴',
    component: CharacterSheetPageThree,
    printClass: 'page-three',
    visibility: { type: 'config', configKey: 'rangerCompanion' },
    printOrder: 4,
    showInTabs: true
  },
  {
    id: 'page4',
    label: '主板扩展',
    component: ArmorTemplatePage,
    printClass: 'page-iknis',
    visibility: { type: 'config', configKey: 'armorTemplate' },
    printOrder: 5,
    showInTabs: true
  },
  {
    id: 'adventure-notes',
    label: '冒险笔记',
    component: CharacterSheetPageAdventureNotes,
    printClass: 'page-adventure-notes',
    visibility: { type: 'config', configKey: 'adventureNotes' },
    printOrder: 6,
    showInTabs: true
  },
  {
    id: 'focused-cards',
    label: '配置卡组',
    component: CharacterSheetPageFour,
    printClass: 'page-four',
    visibility: {
      type: 'data',
      dataCheck: (data) => {
        // 检查聚焦卡组（排除第一张卡）
        return data.cards && data.cards.length > 1 &&
          data.cards.slice(1).some(card => card && !isEmptyCard(card))
      }
    },
    printOrder: 7,
    showInTabs: false  // 不在Tab中显示
  },
  {
    id: 'inventory-cards',
    label: '宝库卡组',
    component: CharacterSheetPageFive,
    printClass: 'page-five',
    visibility: {
      type: 'data',
      dataCheck: (data) => {
        // 检查库存卡组
        return !!(data.inventory_cards && data.inventory_cards.length > 0 &&
          data.inventory_cards.some(card => card && !isEmptyCard(card)))
      }
    },
    printOrder: 8,
    showInTabs: false  // 不在Tab中显示
  }
])

export default function Home() {
  const setFormData = useSheetStore((state) => state.setSheetData)
  // 顶层导航只关心页面可见性；角色字段编辑不再让 Home 整体重渲染。
  const navigationData = useSheetStore(useShallow((state) => ({
    ruleSetId: state.sheetData.ruleSetId,
    pageVisibility: state.sheetData.pageVisibility,
  })))

  // 钉住卡牌状态
  const { pinnedCards } = usePinnedCardsStore();
  // 卡牌操作方法
  const { deleteCard, moveCard, updateCard } = useCardActions();
  const setTextMode = useTextModeStore((state) => state.setTextMode)
  const {
    metadata: officialImagePackMetadata,
    hydrated: officialImagePackHydrated,
    setMetadata: setOfficialImagePackMetadata,
    clearMetadata: clearOfficialImagePackMetadata,
  } = useOfficialImagePackStore()
  const {
    lastSeenAnnouncementId,
    hydrated: announcementHydrated,
    markAnnouncementSeen,
  } = useAnnouncementStore()
  // 文字模式状态
  const { isTextMode, toggleTextMode } = useTextModeStore();
  // 双页模式状态
  const { 
    isDualPageMode, 
    leftPageId, 
    rightPageId, 
    leftTabValue, 
    rightTabValue, 
    setLeftTab, 
    setRightTab 
  } = useDualPageStore();
  // 添加客户端挂载状态
  const [isClient, setIsClient] = useState(false)
  // 添加移动设备检测
  const [isMobile, setIsMobile] = useState(false)
  
  // UI状态
  const [isPrintingAll, setIsPrintingAll] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [characterManagementModalOpen, setCharacterManagementModalOpen] = useState(false)
  const [characterCodeExportModalOpen, setCharacterCodeExportModalOpen] = useState(false)
  const [sealDiceExportModalOpen, setSealDiceExportModalOpen] = useState(false)
  const [currentTabValue, setCurrentTabValue] = useState("page1")
  const [showShortcutHint, setShowShortcutHint] = useState(false)
  const [isCardDrawerOpen, setIsCardDrawerOpen] = useState(false)
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false)
  const [isImportingOfficialImagePack, setIsImportingOfficialImagePack] = useState(false)
  const [officialImagePackImportProgress, setOfficialImagePackImportProgress] =
    useState<OfficialImagePackImportProgress | null>(null)

  // 添加卡牌相关状态
  const [pendingCardIndex, setPendingCardIndex] = useState<number | null>(null)
  const [pendingCardIsInventory, setPendingCardIsInventory] = useState<boolean>(false)
  const [cardSelectionModalOpen, setCardSelectionModalOpen] = useState(false)

  // 使用角色管理Hook
  const {
    currentCharacterId,
    activeRuleSetId,
    characterList,
    isLoading,
    switchToCharacter,
    switchRuleSetHandler,
    createNewCharacterHandler,
    deleteCharacterHandler,
    duplicateCharacterHandler,
    renameCharacterHandler,
    handleQuickCreateArchive,
    persistCharacterData,
  } = useCharacterManagement({ isClient, setCurrentTabValue })
  
  // 打印容器引用
  const printContainerRef = useRef<HTMLDivElement>(null)
  const officialImagePackInputRef = useRef<HTMLInputElement>(null)

  // 额外需要的MAX_CHARACTERS常量
  const MAX_CHARACTERS = 10
  const announcements = useMemo(() => getAnnouncements(), [])
  const latestAnnouncementId = useMemo(() => getLatestAnnouncementId(), [])
  const hasOfficialImagePack = !!officialImagePackMetadata?.available
  const isRhodesIsland = activeRuleSetId === "rhodes-island"
  const hasCardImages = isRhodesIsland || hasOfficialImagePack
  const officialImagePackProgressView = officialImagePackImportProgress
    ? getOfficialImagePackProgressView(officialImagePackImportProgress)
    : null
  const visibleTabs = useMemo(() => {
    return getTabPages({ ...defaultSheetData, ...navigationData })
  }, [navigationData])

  // 使用导出功能Hook
  const {
    handlePrintAll,
    handleExportHTML,
    handleExportJSON,
    handleExportCharacterCode,
    handleQuickExportPDF,
    handleQuickExportHTML,
    handleQuickExportJSON,
  } = useExportHandlers({ setIsPrintingAll })

  // 客户端挂载检测
  // Client-only initialization
  useEffect(() => {
    setIsClient(true)
    // Set the default page title.
    document.title = "Character Sheet"

    // Show the shortcut hint briefly after mount.
    const timer = setTimeout(() => {
      setShowShortcutHint(true)
      setTimeout(() => setShowShortcutHint(false), 3000)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const ruleSetId = navigationData.ruleSetId
    document.body.dataset.ruleset = ruleSetId
    return () => {
      if (document.body.dataset.ruleset === ruleSetId) {
        delete document.body.dataset.ruleset
      }
    }
  }, [navigationData.ruleSetId])

  useEffect(() => {
    const preloadDeferredTools = () => {
      void loadCharacterManagementModal()
      void loadCharacterCodeExportModal()
      void loadSealDiceExportModal()
    }
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number
      cancelIdleCallback?: (handle: number) => void
    }
    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(preloadDeferredTools)
      return () => idleWindow.cancelIdleCallback?.(idleId)
    }
    const timeoutId = window.setTimeout(preloadDeferredTools, 1200)
    return () => window.clearTimeout(timeoutId)
  }, [])

  // 移动设备检测
  // Detect mobile layout changes.
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window)
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)

    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  useEffect(() => {
    if (!officialImagePackHydrated) {
      return
    }

    if (!isRhodesIsland && !hasOfficialImagePack) {
      setTextMode(true)
    }
  }, [hasOfficialImagePack, isRhodesIsland, officialImagePackHydrated, setTextMode])

  useEffect(() => {
    if (!isClient || !announcementHydrated || !latestAnnouncementId) {
      return
    }

    if (lastSeenAnnouncementId !== latestAnnouncementId) {
      setAnnouncementModalOpen(true)
    }
  }, [
    announcementHydrated,
    isClient,
    lastSeenAnnouncementId,
    latestAnnouncementId,
  ])

  const handleOpenOfficialImagePackPicker = () => {
    if (isImportingOfficialImagePack) {
      return
    }

    officialImagePackInputRef.current?.click()
  }

  const handleOfficialImagePackFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    setIsImportingOfficialImagePack(true)
    setOfficialImagePackImportProgress({
      phase: "loading-zip",
      processed: 0,
      total: 0,
      percent: 0,
    })

    try {
      const result = await importOfficialImagePack(file, {
        onProgress: setOfficialImagePackImportProgress,
      })
      setOfficialImagePackMetadata(result.metadata)

      showFadeNotification({
        message: `卡图包导入成功，共导入 ${result.metadata.imageCount} 张图片`,
        type: "success",
      })

      if (result.warnings.length > 0) {
        showFadeNotification({ message: `卡图包已导入，但有提示：${result.warnings.join("；")}`, type: "info" })
      }
    } catch (error) {
      console.error("[OfficialImagePack] Import failed:", error)
      showFadeNotification({
        message: `卡图包导入失败：${error instanceof Error ? error.message : "未知错误"}`,
        type: "error",
      })
    } finally {
      setIsImportingOfficialImagePack(false)
      setOfficialImagePackImportProgress(null)
    }
  }

  const handleClearOfficialImagePack = async () => {
    if (!hasOfficialImagePack || isImportingOfficialImagePack) {
      return
    }

    const confirmed = await confirm({
      title: "清除本地官方卡图缓存",
      description: "确认清除当前本地官方卡图缓存吗？",
      confirmText: "清除",
      variant: "destructive",
    })
    if (!confirmed) {
      return
    }

    try {
      await clearOfficialImagePackData()
      clearOfficialImagePackMetadata()
      setTextMode(true)

      showFadeNotification({
        message: "本地官方卡图已清除，已切回文字模式",
        type: "success",
      })
    } catch (error) {
      console.error("[OfficialImagePack] Clear failed:", error)
      showFadeNotification({
        message: `清除卡图失败：${error instanceof Error ? error.message : "未知错误"}`,
        type: "error",
      })
    }
  }

  const handleModeToggle = () => {
    if (!hasCardImages && isTextMode) {
      showFadeNotification({
        message: "当前为 SRD 版本，请先导入卡图包后再切换图片模式",
        type: "info",
      })
      return
    }

    toggleTextMode()
  }

  const handleAnnouncementAcknowledge = () => {
    if (latestAnnouncementId) {
      markAnnouncementSeen(latestAnnouncementId)
    }

    setAnnouncementModalOpen(false)
  }

  const closeCharacterManagementModal = () => {
    setCharacterManagementModalOpen(false)
  }

  // 移除旧的第三页导出控制函数 - 现在使用 PageVisibilityDropdown

  // 生成可见的tab配置
  useSheetAutoSave({
    currentCharacterId,
    isLoading,
    persistCharacterData,
  })









  // Effect for handling "Print All Pages" - 移除自动打印功能
  // useEffect(() => {
  //   if (isPrintingAll) {
  //     const printTimeout = setTimeout(() => {
  //       window.print();
  //       setIsPrintingAll(false);
  //     }, 500);

  //     return () => {
  //       clearTimeout(printTimeout);
  //     };
  //   }
  // }, [isPrintingAll])

  // 切换建卡指引显示状态
  const toggleGuide = () => {
    setIsGuideOpen(!isGuideOpen)
  }

  // 切换笔记本显示状态
  const toggleNotebook = () => {
    setFormData(prev => ({
      ...prev,
      notebook: {
        ...(prev.notebook || { pages: [{ id: 'page-1', lines: [] }], currentPageIndex: 0, isOpen: false }),
        isOpen: !(prev.notebook?.isOpen ?? false)
      }
    }))
  }

  // 快速新建存档

  // 页面切换逻辑 - 基于页面注册系统
  const getAvailablePages = () => {
    return visibleTabs.map(tab => tab.tabValue || tab.id)
  }

  const switchToNextPage = () => {
    const pages = getAvailablePages()
    const currentIndex = pages.indexOf(currentTabValue)
    // 循环：如果在最后一页，跳转到第一页
    const nextIndex = currentIndex < pages.length - 1 ? currentIndex + 1 : 0
    setCurrentTabValue(pages[nextIndex])
  }

  const switchToPrevPage = () => {
    const pages = getAvailablePages()
    const currentIndex = pages.indexOf(currentTabValue)
    // 循环：如果在第一页，跳转到最后一页
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : pages.length - 1
    setCurrentTabValue(pages[prevIndex])
  }

  const switchToPage = (pageValue: string) => {
    const pages = getAvailablePages()
    if (pages.includes(pageValue)) {
      setCurrentTabValue(pageValue)
    }
  }



  // 从 JSON 导入新建存档
  const handleQuickImportFromJSON = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const validation = validateJSONCharacterData(await file.text())

        if (!validation.valid || !validation.data) {
          showFadeNotification({
            message: `JSON 导入失败：${validation.error || '文件格式不正确'}`,
            type: 'error',
          })
          return
        }

        if (validation.data.ruleSetId !== activeRuleSetId) {
          showFadeNotification({
            message: `该存档属于“${RULE_SET_LABELS[validation.data.ruleSetId]}”，请先切换到对应规则后再导入`,
            type: 'error',
          })
          return
        }

        const characterName = validation.data.name || '未命名角色'
        const saveName = await promptDialog({
          title: '从 JSON 新建存档',
          label: '存档名称',
          defaultValue: `${characterName} (JSON导入)`,
          confirmText: '创建',
        })

        if (!saveName?.trim()) return

        const success = createNewCharacterHandler(saveName.trim())
        if (!success) {
          showFadeNotification({
            message: '创建新存档失败，可能已达到存档数量上限',
            type: 'error',
          })
          return
        }

        setFormData(validation.data)
        setCurrentTabValue('page1')

        if (validation.warnings.length > 0) {
          showFadeNotification({
            message: `JSON 导入成功并创建新存档“${saveName.trim()}”，但有警告：${validation.warnings.join('；')}`,
            type: 'info',
          })
        } else {
          showFadeNotification({
            message: `JSON 导入成功并创建新存档“${saveName.trim()}”`,
            type: 'success',
          })
        }
      } catch (error) {
        console.error('JSON 导入失败:', error)
        showFadeNotification({
          message: `JSON 导入失败：${error instanceof Error ? error.message : '未知错误'}`,
          type: 'error',
        })
      }
    }
    input.click()
  }

  // 从HTML导入新建存档
  const handleQuickImportFromHTML = () => {
    // 创建文件输入元素
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.html'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          const { importCharacterFromHTMLFile } = await import('@/lib/html-importer')
          const result = await importCharacterFromHTMLFile(file)

          if (result.success && result.data) {
            // 从导入的数据中提取角色名称作为默认存档名
            const characterName = result.data.name || "未命名角色"
            const defaultSaveName = `${characterName} (HTML导入)`

            // 提示用户输入存档名称
            const saveName = await promptDialog({
              title: '新建存档',
              label: '存档名称',
              defaultValue: defaultSaveName,
              confirmText: '创建',
            })
            if (saveName && saveName.trim()) {
              // 先创建新存档
              const success = createNewCharacterHandler(saveName.trim())
              if (success) {
                // 创建成功后导入数据
                setFormData(result.data)
                if (result.warnings && result.warnings.length > 0) {
                  showFadeNotification({ message: `HTML导入成功并创建新存档"${saveName}"，但有警告：${result.warnings.join('；')}`, type: 'info' })
                } else {
                  showFadeNotification({ message: `HTML导入成功并创建新存档"${saveName}"`, type: 'success' })
                }
              } else {
                showFadeNotification({ message: '创建新存档失败，可能已达到存档数量上限', type: 'error' })
              }
            }
          } else {
            showFadeNotification({ message: `HTML导入失败：${result.error}`, type: 'error' })
          }
        } catch (error) {
          console.error('HTML导入失败:', error)
          showFadeNotification({ message: 'HTML导入失败: ' + (error instanceof Error ? error.message : '未知错误'), type: 'error' })
        }
      }
    }
    input.click()
  }


  // 键盘快捷键 - 页面切换 + 存档切换 + ESC退出预览
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC键退出导出预览
      if (event.key === 'Escape' && isPrintingAll) {
        event.preventDefault()
        setIsPrintingAll(false)
        console.log('[App] ESC键退出导出预览')
        return
      }

      // 检查是否在输入框中
      const isInputFocused = document.activeElement && (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement).contentEditable === 'true'
      )

      // 页面切换快捷键（无修饰键）
      if (!event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && !isPrintingAll && !characterManagementModalOpen && !isGuideOpen && !isInputFocused) {
        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault()
            switchToPrevPage()
            console.log('[App] 箭头键切换到上一页')
            break
          case 'ArrowRight':
            event.preventDefault()
            switchToNextPage()
            console.log('[App] 箭头键切换到下一页')
            break
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9':
            event.preventDefault()
            // 动态映射数字键到可见的tabs
            const keyNumber = parseInt(event.key)
            const availablePages = getAvailablePages()
            if (keyNumber > 0 && keyNumber <= availablePages.length) {
              const targetPage = availablePages[keyNumber - 1]
              switchToPage(targetPage)
              console.log(`[App] 数字键${keyNumber}切换到页面`)
            }
            break
        }
      }

      // Ctrl+数字键切换存档
      if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
        const key = event.key
        let targetIndex = -1

        if (key >= '1' && key <= '9') {
          targetIndex = parseInt(key) - 1 // 1对应索引0
        } else if (key === '0') {
          targetIndex = 9 // 0对应索引9（第10个存档）
        }

        if (targetIndex >= 0 && targetIndex < characterList.length) {
          event.preventDefault()
          const targetCharacter = characterList[targetIndex]
          if (targetCharacter.id !== currentCharacterId) {
            switchToCharacter(targetCharacter.id)
            console.log(`[App] 快捷键切换到存档 ${targetIndex + 1}: ${targetCharacter.saveName}`)
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [characterList, currentCharacterId, characterManagementModalOpen, isPrintingAll, isGuideOpen, currentTabValue, visibleTabs])

  // 已移除聚焦卡牌变更处理函数 - 功能由双卡组系统取代

  // 允许页面在客户端初始化的同时显示加载状态
  if (!isClient) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <div className="text-lg">初始化中...</div>
        <div className="text-sm text-gray-500 mt-2">正在启动客户端...</div>
      </div>
    )
  }

  // 客户端已挂载，但数据还在加载
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <div className="text-lg">
          加载中...
        </div>
        <div className="text-sm text-gray-500 mt-2">
          正在加载角色数据
        </div>
      </div>
    )
  }

  if (isPrintingAll) {
    const handleSkipWaiting = () => {
      console.log('[App] 用户选择跳过图片加载等待，页面将立即显示')
    }

    return (
      <PrintProvider containerRef={printContainerRef}>
        <PrintReadyChecker onSkipWaiting={handleSkipWaiting}>
          <ExportPreviewShell ruleSetId={activeRuleSetId}>
            <PrintHelper />

            {/* 顶部提示横条 - 只在屏幕上显示，打印时隐藏 */}
            <div className="fixed top-0 left-0 right-0 z-[70] print:hidden">
              <div
                data-export-preview-banner={activeRuleSetId}
                className="export-preview-banner px-6 py-3 text-center cursor-pointer transition-[color,background-color,box-shadow,opacity] duration-200"
                onClick={() => setIsPrintingAll(false)}
              >
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                  <span className="export-preview-ruleset-label text-xs font-semibold tracking-[0.14em]">
                    {activeRuleSetId === "rhodes-island" ? "罗德岛终端 · 导出预览" : "DAGGERHEART · 导出预览"}
                  </span>
                  <span className="text-sm">
                    按 <kbd className="export-preview-kbd px-2 py-1 rounded text-xs mx-1">ESC</kbd> 键或点击此处退出预览
                  </span>
                </div>
              </div>
            </div>

            {/* 打印预览控制按钮 */}
            <BottomDock
              mode="preview"
              ruleSetId={activeRuleSetId}
              isMobile={isMobile}
              onExportPDF={() => window.print()}
              onExportHTML={handleExportHTML}
              onExportJSON={handleExportJSON}
              onOpenSealDiceExport={() => {
                setSealDiceExportModalOpen(true)
                setIsPrintingAll(false)
              }}
              onOpenCharacterCodeExport={() => {
                setCharacterCodeExportModalOpen(true)
                setIsPrintingAll(false)
              }}
              onClose={() => setIsPrintingAll(false)}
            />

            {/* 打印内容容器 - 用于图片加载检测 */}
            <div ref={printContainerRef}>
              <StoreConnectedPrintPageRenderer />
            </div>
          </ExportPreviewShell>
        </PrintReadyChecker>
      </PrintProvider>
    )
  }

  // 处理添加卡牌
  const handleAddCard = (index: number, isInventory: boolean) => {
    if (index === -1) {
      showFadeNotification({
        message: "卡组已满，无法添加更多卡牌",
        type: "error"
      });
      return;
    }
    setPendingCardIndex(index);
    setPendingCardIsInventory(isInventory);
    setCardSelectionModalOpen(true);
  }

  // 处理卡牌选择
  const handleCardSelect = (card: StandardCard) => {
    if (pendingCardIndex !== null) {
      updateCard(pendingCardIndex, card, pendingCardIsInventory);
      setCardSelectionModalOpen(false);
      setPendingCardIndex(null);
      setPendingCardIsInventory(false);
      showFadeNotification({
        message: `卡牌已添加到${pendingCardIsInventory ? '库存' : '聚焦'}卡组`,
        type: "success"
      });
    }
  }

  return (
    <main
      data-ruleset={activeRuleSetId}
      data-ri-app={isRhodesIsland ? "terminal" : undefined}
      className={`min-w-0 w-full max-w-full mx-auto px-0 container ${isRhodesIsland ? 'rhodes-island-shell' : ''} ${isMobile ? 'pb-32' : 'pb-20'
      }`}
    >
      <CardSystemInitializer />

      {/* 底部抽屉式卡牌展示 - 打印时隐藏 */}
      <div className="print:hidden">
        <StoreConnectedCardDrawer
          isOpen={isCardDrawerOpen}
          onClose={() => setIsCardDrawerOpen(false)}
          onDeleteCard={deleteCard}
          onMoveCard={moveCard}
          onAddCard={handleAddCard}
          isModalOpen={cardSelectionModalOpen}
        />
      </div>

      <div className="flex justify-center px-0">
        <div className={`w-full ${isDualPageMode && !isMobile ? 'overflow-x-auto' : 'md:max-w-[220mm]'}`}>
          {/* 角色卡区域 - 带相对定位 */}
          <div>
            {/* 页面标题 - 打印时隐藏 */}
            <div data-ri-utility-bar className={`print:hidden mb-3 pt-2 ${isDualPageMode && !isMobile ? 'w-[425mm] min-w-[425mm]' : 'w-[210mm]'}`}>
              <div className="flex items-center justify-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-auto px-3 text-[13px]"
                  onClick={() => switchRuleSetHandler(isRhodesIsland ? "daggerheart" : "rhodes-island")}
                  aria-label={`切换到${RULE_SET_LABELS[isRhodesIsland ? "daggerheart" : "rhodes-island"]}`}
                  title={`当前：${RULE_SET_LABELS[activeRuleSetId]}`}
                >
                  切换规则
                </Button>
                <SaveSwitcher
                  characterList={characterList}
                  currentCharacterId={currentCharacterId}
                  onRenameCharacter={renameCharacterHandler}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-auto px-3 text-[13px]"
                  onClick={() => setAnnouncementModalOpen(true)}
                >
                  公告
                </Button>
              </div>
            </div>

            {/* 页面显示组件 */}
            <PageDisplay
              isDualPageMode={isDualPageMode}
              isMobile={isMobile}
              leftPageId={leftPageId}
              rightPageId={rightPageId}
              leftTabValue={leftTabValue}
              rightTabValue={rightTabValue}
              currentTabValue={currentTabValue}
              visibleTabs={visibleTabs}
              ruleSetId={navigationData.ruleSetId}
              onSetLeftTab={setLeftTab}
              onSetRightTab={setRightTab}
              onSetCurrentTab={setCurrentTabValue}
              onSwitchToPrevPage={switchToPrevPage}
              onSwitchToNextPage={switchToNextPage}
            />

          </div>

          {/* 文字模式切换开关 - 胶囊型，在容器外右下角 */}
          <div data-ri-mode-region className={`print:hidden mt-3 flex flex-col gap-3 ${isDualPageMode && !isMobile ? 'w-[425mm] min-w-[425mm]' : 'w-[210mm]'}`}>
            <div data-ri-mode-card className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">
                  {isRhodesIsland ? "罗德岛离线卡库" : hasOfficialImagePack ? "卡图包已导入" : "当前为 SRD 纯文字模式"}
                </div>
                {!isRhodesIsland && (
                  <div className="text-xs text-slate-500">
                    {hasOfficialImagePack
                      ? `版本 ${officialImagePackMetadata?.version}，共 ${officialImagePackMetadata?.imageCount} 张`
                      : "导入官方卡图包后可启用图片模式"}
                  </div>
                )}
                {officialImagePackMetadata?.warnings?.[0] && (
                  <div className="mt-1 text-xs text-amber-600">
                    {officialImagePackMetadata.warnings[0]}
                  </div>
                )}
              </div>
            <div
              data-ri-mode-toggle
              className={`rounded-full p-0.5 shadow-md transition-[transform,opacity,background-color,box-shadow] duration-200 hover:shadow-lg scale-90 ${
                hasCardImages
                  ? 'cursor-pointer bg-gray-200 dark:bg-gray-700'
                  : 'cursor-not-allowed bg-slate-200 opacity-80'
              }`}
              onClick={handleModeToggle}
            >
              <div className="flex items-center">
                <div
                  className={`
                    px-2 py-1 rounded-full flex items-center gap-1 transition-[color,background-color,box-shadow,opacity,transform] duration-300 text-xs
                    ${!isTextMode
                      ? 'bg-white dark:bg-gray-900 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  <ImageIcon />
                  <span className="font-medium">图片</span>
                </div>
                <div
                  className={`
                    px-2 py-1 rounded-full flex items-center gap-1 transition-[color,background-color,box-shadow,opacity,transform] duration-300 text-xs
                    ${isTextMode
                      ? 'bg-white dark:bg-gray-900 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  <TextIcon />
                  <span className="font-medium">文字</span>
                </div>
              </div>
            </div>

            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {!isRhodesIsland && <Button
                size="sm"
                onClick={handleOpenOfficialImagePackPicker}
                disabled={isImportingOfficialImagePack}
              >
                {isImportingOfficialImagePack && officialImagePackProgressView
                  ? `导入中 ${officialImagePackProgressView.percent}%`
                  : "导入卡图"}
              </Button>}
              {!isRhodesIsland && <Button
                size="sm"
                variant="outline"
                onClick={handleClearOfficialImagePack}
                disabled={!hasOfficialImagePack || isImportingOfficialImagePack}
              >
                清除卡图
              </Button>}
            </div>

            {isImportingOfficialImagePack && officialImagePackProgressView && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-3 text-sm text-sky-900">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
                    <span className="font-medium">{officialImagePackProgressView.label}</span>
                  </div>
                  <span className="tabular-nums">{officialImagePackProgressView.percent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-100">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-[width] duration-300"
                    style={{ width: `${officialImagePackProgressView.percent}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-sky-700">
                  {officialImagePackProgressView.detail}
                </div>
              </div>
            )}

            <input
              ref={officialImagePackInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleOfficialImagePackFileChange}
            />
          </div>
        </div>
      </div>

      {/* 底部功能按钮区域 */}
      <BottomDock
        mode="main"
        ruleSetId={activeRuleSetId}
        isMobile={isMobile}
        isCardDrawerOpen={isCardDrawerOpen}
        characterCount={characterList.length}
        onToggleCardDrawer={() => setIsCardDrawerOpen(!isCardDrawerOpen)}
        onToggleGuide={toggleGuide}
        onToggleNotebook={toggleNotebook}
        onPrintAll={handlePrintAll}
        onOpenCharacterCodeExport={() => setCharacterCodeExportModalOpen(true)}
        onOpenSealDiceExport={() => setSealDiceExportModalOpen(true)}
        onQuickExportJSON={handleQuickExportJSON}
        onQuickExportPDF={handleQuickExportPDF}
        onQuickExportHTML={handleQuickExportHTML}
        onOpenCharacterManagement={() => setCharacterManagementModalOpen(true)}
        onQuickCreateArchive={handleQuickCreateArchive}
        onQuickImportFromJSON={handleQuickImportFromJSON}
        onQuickImportFromHTML={handleQuickImportFromHTML}
      />

      {/* 快捷键提示 */}
      {showShortcutHint && (
        <div className="print:hidden fixed top-4 right-4 z-40 animate-in slide-in-from-top duration-300">
          <div className="bg-black/90 text-white px-4 py-3 rounded-lg text-sm">
            <div className="font-medium mb-2">⌨️ 快捷键提示</div>
            <div className="space-y-1 text-xs">
              <div>← → 切换页面</div>
              <div>1 2 3 直接跳转</div>
              <div>Ctrl+数字 切换存档</div>
            </div>
          </div>
        </div>
      )}

      {/* 建卡指引组件 - 移到父组件 */}
      {announcementModalOpen && (
        <AnnouncementModal
          announcements={announcements}
          open={announcementModalOpen}
          onOpenChange={setAnnouncementModalOpen}
          onAcknowledge={handleAnnouncementAcknowledge}
        />
      )}

      {isGuideOpen && (
        <CharacterCreationGuide
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
        />
      )}

      {/* 存档管理模态框 */}
      {characterManagementModalOpen && (
        <CharacterManagementModal
          isOpen={characterManagementModalOpen}
          onClose={closeCharacterManagementModal}
          characterList={characterList}
          currentCharacterId={currentCharacterId}
          onSwitchCharacter={switchToCharacter}
          onCreateCharacter={createNewCharacterHandler}
          onDeleteCharacter={deleteCharacterHandler}
          onDuplicateCharacter={duplicateCharacterHandler}
          onRenameCharacter={renameCharacterHandler}
        />
      )}

      {/* 添加卡牌选择模态框 */}
      {pendingCardIndex !== null && (
        <CardSelectionModal
          isOpen={cardSelectionModalOpen}
          onClose={() => {
            setCardSelectionModalOpen(false);
            setPendingCardIndex(null);
            setPendingCardIsInventory(false);
          }}
          onSelect={handleCardSelect}
          selectedCardIndex={pendingCardIndex}
          initialTab="domain"
        />
      )}

      {/* 骰子导出模态框 */}
      {characterCodeExportModalOpen && (
        <CharacterCodeExportModal
          isOpen={characterCodeExportModalOpen}
          onClose={() => setCharacterCodeExportModalOpen(false)}
          getCharacterCode={handleExportCharacterCode}
        />
      )}

      {sealDiceExportModalOpen && (
        <StoreConnectedSealDiceExportModal
          isOpen={sealDiceExportModalOpen}
          onClose={() => setSealDiceExportModalOpen(false)}
        />
      )}

      {/* 钉住的卡牌窗口 - 全局渲染，不受页面切换影响 */}
      {pinnedCards.map((pinnedCard) => (
        <PinnedCardWindow
          key={pinnedCard.id}
          pinnedCard={pinnedCard}
        />
      ))}

      {/* 悬浮笔记本 */}
      <FloatingNotebook />
    </main>
  )
}
