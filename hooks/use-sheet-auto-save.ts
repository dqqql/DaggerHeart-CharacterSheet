"use client"

import { useEffect, useRef } from "react"
import { getActiveCharacterId } from "@/lib/multi-character-storage"
import type { SheetData } from "@/lib/sheet-data"
import { subscribeToSheetAutoSave } from "@/lib/sheet-auto-save-bridge"
import { useSheetStore } from "@/lib/sheet-store"

interface UseSheetAutoSaveOptions {
  currentCharacterId: string | null
  isLoading: boolean
  persistCharacterData: (characterId: string, data: SheetData) => void
}

export function useSheetAutoSave({
  currentCharacterId,
  isLoading,
  persistCharacterData,
}: UseSheetAutoSaveOptions) {
  const currentCharacterIdRef = useRef(currentCharacterId)
  const isLoadingRef = useRef(isLoading)
  const persistCharacterDataRef = useRef(persistCharacterData)

  currentCharacterIdRef.current = currentCharacterId
  isLoadingRef.current = isLoading
  persistCharacterDataRef.current = persistCharacterData

  useEffect(() => subscribeToSheetAutoSave({
    store: useSheetStore,
    // 读取同步更新的存储指针，覆盖 React 状态尚未提交时的快速导入/切换。
    resolveCharacterId: (sheetData) =>
      getActiveCharacterId(sheetData.ruleSetId) ?? currentCharacterIdRef.current,
    shouldSave: () => !isLoadingRef.current,
    save: (characterId, sheetData) => {
      persistCharacterDataRef.current(characterId, sheetData)
      console.log(`[App] Auto-saved character: ${characterId}`)
    },
    onError: (error, characterId) => {
      console.error(`[App] Error auto-saving character ${characterId}:`, error)
    },
  }), [])
}
