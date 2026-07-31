import type { SheetData } from "@/lib/sheet-data"

interface SheetAutoSaveState {
  sheetData: SheetData
  sheetDataGeneration: number
}

interface SheetStoreSubscription {
  getState: () => SheetAutoSaveState
  subscribe: (
    listener: (
      state: SheetAutoSaveState,
      previousState: SheetAutoSaveState,
    ) => void,
  ) => () => void
}

interface SheetAutoSaveBridgeOptions {
  store: SheetStoreSubscription
  resolveCharacterId: (sheetData: SheetData) => string | null
  shouldSave?: () => boolean
  save: (characterId: string, sheetData: SheetData) => void
  delay?: number
  onError?: (error: unknown, characterId: string) => void
}

/**
 * 将自动保存放在 React 视觉树之外。整份数据替换表示正在加载或切换角色：
 * 此时取消旧防抖任务且不写盘；普通编辑才会启动新的防抖任务。
 */
export function subscribeToSheetAutoSave({
  store,
  resolveCharacterId,
  shouldSave = () => true,
  save,
  delay = 300,
  onError,
}: SheetAutoSaveBridgeOptions): () => void {
  let timeout: ReturnType<typeof setTimeout> | undefined

  const cancelPendingSave = () => {
    if (timeout !== undefined) {
      clearTimeout(timeout)
      timeout = undefined
    }
  }

  const unsubscribe = store.subscribe((state, previousState) => {
    if (state.sheetDataGeneration !== previousState.sheetDataGeneration) {
      cancelPendingSave()
      return
    }

    if (state.sheetData === previousState.sheetData || !shouldSave()) {
      return
    }

    const characterId = resolveCharacterId(state.sheetData)
    if (!characterId) {
      return
    }

    const snapshot = state.sheetData
    cancelPendingSave()
    timeout = setTimeout(() => {
      timeout = undefined
      try {
        save(characterId, snapshot)
      } catch (error) {
        onError?.(error, characterId)
      }
    }, delay)
  })

  return () => {
    cancelPendingSave()
    unsubscribe()
  }
}
