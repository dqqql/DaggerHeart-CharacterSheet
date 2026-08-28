import { useCallback } from "react"
import { exportCharacterCode } from "@/lib/character-code"
import { exportCharacterData } from "@/lib/storage"
import { withRhodesIslandDefaultAncestryExperience } from "@/lib/rulesets/rhodes-island/experience"
import { useSheetStore } from "@/lib/sheet-store"

const WAIT_TIMEOUT = 10000
const CHECK_INTERVAL = 100
const RENDER_DELAY = 300

interface UseExportHandlersProps {
  setIsPrintingAll: (value: boolean) => void
}

function waitForAllImagesLoaded(): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now()

    const checkImages = () => {
      const images = document.querySelectorAll("img")
      const total = images.length

      if (total === 0) {
        setTimeout(resolve, RENDER_DELAY)
        return
      }

      let loaded = 0
      images.forEach((image) => {
        if (image.complete) {
          loaded += 1
        }
      })

      const elapsed = Date.now() - startTime

      if (loaded === total) {
        console.log(`[ExportHandlers] All images loaded (${loaded}/${total})`)
        setTimeout(resolve, RENDER_DELAY)
      } else if (elapsed >= WAIT_TIMEOUT) {
        console.log(`[ExportHandlers] Image loading timed out (${loaded}/${total})`)
        resolve()
      } else {
        setTimeout(checkImages, CHECK_INTERVAL)
      }
    }

    setTimeout(checkImages, 200)
  })
}

export function useExportHandlers({
  setIsPrintingAll,
}: UseExportHandlersProps) {
  const handlePrintAll = useCallback(async () => {
    const formData = useSheetStore.getState().sheetData
    const { getStandardCardById } = await import("@/card")

    const getCardClass = (cardId: string | undefined): string => {
      if (!cardId) return "()"

      try {
        const card = getStandardCardById(cardId)
        return card?.class ? String(card.class) : "()"
      } catch (error) {
        console.error("Error getting card class:", error)
        return "()"
      }
    }

    const name = formData.name || "()"
    const level = formData.level || "()"
    const ancestry1Class = getCardClass(formData.ancestry1Ref?.id)
    const professionClass = getCardClass(formData.professionRef?.id)
    const ancestry2Class = getCardClass(formData.ancestry2Ref?.id)
    const communityClass = getCardClass(formData.communityRef?.id)

    document.title = `${name}-${professionClass}-${ancestry1Class}-${ancestry2Class}-${communityClass}-LV${level}`
    setIsPrintingAll(true)

    await new Promise((resolve) => setTimeout(resolve, 100))
  }, [setIsPrintingAll])

  const handleExportHTML = useCallback(async () => {
    try {
      const formData = useSheetStore.getState().sheetData
      console.log("[ExportHandlers] Starting HTML export")
      const { exportToHTML } = await import("@/lib/html-exporter")
      await exportToHTML(withRhodesIslandDefaultAncestryExperience(formData))
      console.log("[ExportHandlers] HTML export completed")
    } catch (error) {
      console.error("[ExportHandlers] HTML export failed:", error)
      alert(`HTML导出失败: ${error instanceof Error ? error.message : "未知错误"}`)
    }
  }, [])

  const handleExportJSON = useCallback(() => {
    try {
      const formData = useSheetStore.getState().sheetData
      exportCharacterData(withRhodesIslandDefaultAncestryExperience(formData))
      console.log("[ExportHandlers] JSON export completed")
    } catch (error) {
      console.error("[ExportHandlers] JSON export failed:", error)
      alert(`JSON导出失败: ${error instanceof Error ? error.message : "未知错误"}`)
    }
  }, [])

  const handleExportCharacterCode = useCallback(() => {
    return exportCharacterCode(useSheetStore.getState().sheetData)
  }, [])

  const handleQuickExportPDF = useCallback(async () => {
    try {
      console.log("[ExportHandlers] Starting quick PDF export")
      await handlePrintAll()
      await waitForAllImagesLoaded()
      window.print()

      setTimeout(() => {
        setIsPrintingAll(false)
        document.title = "Character Sheet"
      }, 300)
    } catch (error) {
      console.error("[ExportHandlers] Quick PDF export failed:", error)
      alert(`PDF导出失败: ${error instanceof Error ? error.message : "未知错误"}`)
      setIsPrintingAll(false)
      document.title = "Character Sheet"
    }
  }, [handlePrintAll, setIsPrintingAll])

  const handleQuickExportHTML = useCallback(async () => {
    try {
      console.log("[ExportHandlers] Starting quick HTML export")
      await handlePrintAll()
      await waitForAllImagesLoaded()
      await handleExportHTML()
      setIsPrintingAll(false)
      document.title = "Character Sheet"
    } catch (error) {
      console.error("[ExportHandlers] Quick HTML export failed:", error)
      alert(`HTML导出失败: ${error instanceof Error ? error.message : "未知错误"}`)
    }
  }, [handlePrintAll, handleExportHTML, setIsPrintingAll])

  const handleQuickExportJSON = useCallback(async () => {
    try {
      console.log("[ExportHandlers] Starting quick JSON export")
      await handlePrintAll()
      await waitForAllImagesLoaded()
      handleExportJSON()
      setIsPrintingAll(false)
      document.title = "Character Sheet"
    } catch (error) {
      console.error("[ExportHandlers] Quick JSON export failed:", error)
      alert(`JSON导出失败: ${error instanceof Error ? error.message : "未知错误"}`)
    }
  }, [handlePrintAll, handleExportJSON, setIsPrintingAll])

  return {
    handlePrintAll,
    handleExportHTML,
    handleExportJSON,
    handleExportCharacterCode,
    handleQuickExportPDF,
    handleQuickExportHTML,
    handleQuickExportJSON,
  }
}
