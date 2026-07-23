"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { type ArmorItem, armorItems } from "@/data/list/armor"
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock"

interface ArmorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (armorId: string) => void
  title: string
}

const LEVELS = ["T1", "T2", "T3", "T4"] as const
type Level = (typeof LEVELS)[number]

const LEVEL_LABELS: Record<Level, string> = {
  T1: "位阶1",
  T2: "位阶2",
  T3: "位阶3",
  T4: "位阶4",
}

type ProcessedArmorItem = ArmorItem & { id: string }

export function ArmorSelectionModal({
  isOpen,
  onClose,
  onSelect,
  title,
}: ArmorModalProps) {
  useBodyScrollLock(isOpen)
  const [customName, setCustomName] = useState("")
  const [customLevel, setCustomLevel] = useState<Level | "">("")
  const [customDamageThreshold1, setCustomDamageThreshold1] = useState("")
  const [customDamageThreshold2, setCustomDamageThreshold2] = useState("")
  const [customArmorValue, setCustomArmorValue] = useState<number | "">("")
  const [customFeatureName, setCustomFeatureName] = useState("")
  const [customDescription, setCustomDescription] = useState("")
  const [isCustom, setIsCustom] = useState(false)
  const [levelFilter, setLevelFilter] = useState<Level | "">("")
  const [searchTerm, setSearchTerm] = useState("")

  const processedArmorItems = useMemo<ProcessedArmorItem[]>(
    () =>
      armorItems.map((armor) => ({
        ...armor,
        id: armor.名称,
      })),
    [],
  )

  const filteredArmorItems = useMemo(() => {
    return processedArmorItems.filter((armor) => {
      if (levelFilter && armor.等级 !== levelFilter) {
        return false
      }

      if (!searchTerm) {
        return true
      }

      const normalizedSearchTerm = searchTerm.toLowerCase()
      return (
        armor.名称.toLowerCase().includes(normalizedSearchTerm) ||
        armor.描述.toLowerCase().includes(normalizedSearchTerm) ||
        armor.特性名称.toLowerCase().includes(normalizedSearchTerm)
      )
    })
  }, [levelFilter, processedArmorItems, searchTerm])

  useEffect(() => {
    const resetCustomState = () => {
      setCustomName("")
      setCustomLevel("")
      setCustomDamageThreshold1("")
      setCustomDamageThreshold2("")
      setCustomArmorValue("")
      setCustomFeatureName("")
      setCustomDescription("")
      setIsCustom(false)
      setLevelFilter("")
      setSearchTerm("")
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
    } else {
      document.removeEventListener("keydown", handleKeyDown)
      resetCustomState()
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const customDamageThreshold =
    customDamageThreshold1 && customDamageThreshold2
      ? `${customDamageThreshold1}/${customDamageThreshold2}`
      : customDamageThreshold1 || customDamageThreshold2 || ""

  const handleClearSelection = () => {
    setIsCustom(false)
    setCustomName("")
    setCustomLevel("")
    setCustomDamageThreshold1("")
    setCustomDamageThreshold2("")
    setCustomArmorValue("")
    setCustomFeatureName("")
    setCustomDescription("")
    onSelect("none")
  }

  const handleConfirmCustomArmor = () => {
    if (!customName) {
      return
    }

    const customArmorData = {
      名称: customName,
      等级: customLevel || "",
      伤害阈值: customDamageThreshold,
      护甲值: customArmorValue || 0,
      特性名称: customFeatureName,
      描述: customDescription,
    }

    onSelect(JSON.stringify(customArmorData))
    setIsCustom(false)
    setCustomName("")
    setCustomLevel("")
    setCustomDamageThreshold1("")
    setCustomDamageThreshold2("")
    setCustomArmorValue("")
    setCustomFeatureName("")
    setCustomDescription("")
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="armor-selection-title"
        data-armor-selection-modal
        className="relative flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-lg sm:max-h-[85vh]"
      >
        <div
          data-armor-modal-header
          className="flex flex-col items-start gap-3 border-b border-gray-200 p-3 sm:flex-row sm:items-center sm:p-4"
        >
          <h2 id="armor-selection-title" className="text-lg font-bold sm:text-xl">{title}</h2>
          <Button
            variant="destructive"
            onClick={handleClearSelection}
            className="bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-600 sm:ml-auto sm:px-4 sm:text-base"
          >
            清除选择
          </Button>
        </div>

        <div
          data-armor-modal-filter-bar
          className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-gray-50 px-3 py-3 sm:px-4"
        >
          <select
            className="rounded-lg border px-3 py-2 text-sm sm:px-4 sm:text-base"
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value as Level | "")}
          >
            <option value="">等级(全部)</option>
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {LEVEL_LABELS[level]}
              </option>
            ))}
          </select>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setLevelFilter("")
              setSearchTerm("")
            }}
            className="px-3 py-2 text-sm sm:px-4 sm:text-base"
          >
            重置筛选
          </Button>

          <Button
            size="sm"
            variant={isCustom ? "default" : "outline"}
            onClick={() => {
              if (isCustom) {
                setIsCustom(false)
                setCustomName("")
                setCustomLevel("")
                setCustomDamageThreshold1("")
                setCustomDamageThreshold2("")
                setCustomArmorValue("")
                setCustomFeatureName("")
                setCustomDescription("")
              } else {
                setIsCustom(true)
              }
            }}
            className={`px-3 py-2 text-sm sm:px-4 sm:text-base ${isCustom ? "bg-blue-500 text-white" : "border-blue-500 text-blue-500"}`}
          >
            {customName || "自定义护甲"}
          </Button>

          <input
            type="text"
            placeholder="搜索护甲..."
            className="ml-2 min-h-[2rem] flex-1 rounded border px-2 py-1 text-xs sm:min-h-[2.25rem] sm:text-sm"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        {isCustom && (
          <div className="max-h-[65vh] min-h-[45vh] overflow-y-auto border-b border-blue-200 bg-blue-50 sm:max-h-[60vh] sm:min-h-[40vh]">
            <div className="border-b border-blue-200 bg-blue-50 px-2 py-3 sm:px-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">名称</label>
                  <input
                    className="min-h-[2.5rem] w-full rounded border px-2 py-2 text-sm"
                    placeholder="自定义护甲名称"
                    value={customName}
                    onChange={(event) => setCustomName(event.target.value)}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">等级</label>
                  <select
                    className="min-h-[2.5rem] w-full rounded border px-2 py-2 text-sm"
                    value={customLevel}
                    onChange={(event) => setCustomLevel(event.target.value as Level | "")}
                  >
                    <option value="">选择等级</option>
                    {LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {LEVEL_LABELS[level]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">基础阈值</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      className="min-h-[2.5rem] w-full rounded border px-2 py-2 text-sm"
                      placeholder="重伤阈值"
                      value={customDamageThreshold1}
                      onChange={(event) => setCustomDamageThreshold1(event.target.value)}
                    />
                    <span className="text-gray-500">/</span>
                    <input
                      type="number"
                      className="min-h-[2.5rem] w-full rounded border px-2 py-2 text-sm"
                      placeholder="严重阈值"
                      value={customDamageThreshold2}
                      onChange={(event) => setCustomDamageThreshold2(event.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">基础护甲值</label>
                  <input
                    type="number"
                    className="min-h-[2.5rem] w-full rounded border px-2 py-2 text-sm"
                    placeholder="基础护甲值"
                    value={customArmorValue}
                    onChange={(event) =>
                      setCustomArmorValue(event.target.value ? parseInt(event.target.value, 10) : "")
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">特性名称</label>
                  <input
                    className="min-h-[2.5rem] w-full rounded border px-2 py-2 text-sm"
                    placeholder="特性名称"
                    value={customFeatureName}
                    onChange={(event) => setCustomFeatureName(event.target.value)}
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">描述</label>
                  <textarea
                    className="min-h-[4rem] w-full resize-none rounded border px-2 py-2 text-sm"
                    placeholder="护甲描述"
                    rows={3}
                    value={customDescription}
                    onChange={(event) => setCustomDescription(event.target.value)}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <Button
                  size="sm"
                  onClick={handleConfirmCustomArmor}
                  disabled={!customName}
                  className="min-h-[2.5rem] w-full sm:w-auto"
                >
                  确认添加
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleClearSelection}
                  className="min-h-[2.5rem] w-full bg-red-500 text-white hover:bg-red-600 sm:w-auto"
                >
                  取消
                </Button>
              </div>
            </div>
          </div>
        )}

        <ScrollArea data-armor-modal-table className="flex-1 overflow-auto">
          <div className="p-1 sm:p-2">
            <table className="min-w-[max-content] w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-gray-800 text-white">
                <tr>
                  <th className="whitespace-nowrap p-1 text-left text-xs sm:p-2 sm:text-sm">名称</th>
                  <th className="whitespace-nowrap p-1 text-left text-xs sm:p-2 sm:text-sm">等级</th>
                  <th className="whitespace-nowrap p-1 text-left text-xs sm:p-2 sm:text-sm">基础阈值</th>
                  <th className="whitespace-nowrap p-1 text-left text-xs sm:p-2 sm:text-sm">基础护甲值</th>
                  <th className="whitespace-nowrap p-1 text-left text-xs sm:p-2 sm:text-sm">特性名称</th>
                  <th className="whitespace-nowrap p-1 text-left text-xs sm:p-2 sm:text-sm">描述</th>
                </tr>
              </thead>
              <tbody>
                {isCustom && customName && (
                  <tr className="bg-blue-50">
                    <td className="whitespace-nowrap p-1 text-xs sm:p-2 sm:text-sm">{customName}</td>
                    <td className="whitespace-nowrap p-1 text-xs sm:p-2 sm:text-sm">
                      {customLevel ? LEVEL_LABELS[customLevel] : ""}
                    </td>
                    <td className="whitespace-nowrap p-1 text-xs sm:p-2 sm:text-sm">{customDamageThreshold}</td>
                    <td className="whitespace-nowrap p-1 text-xs sm:p-2 sm:text-sm">{customArmorValue}</td>
                    <td className="whitespace-nowrap p-1 text-xs sm:p-2 sm:text-sm">{customFeatureName}</td>
                    <td className="whitespace-nowrap p-1 text-xs sm:p-2 sm:text-sm">{customDescription}</td>
                  </tr>
                )}

                {filteredArmorItems.map((armor) => (
                  <tr
                    key={armor.id}
                    className="cursor-pointer border-b border-gray-200 hover:bg-gray-100"
                    onClick={() => {
                      setIsCustom(false)
                      setCustomName("")
                      setCustomLevel("")
                      setCustomDamageThreshold1("")
                      setCustomDamageThreshold2("")
                      setCustomArmorValue("")
                      setCustomFeatureName("")
                      setCustomDescription("")
                      onSelect(armor.id)
                    }}
                  >
                    <td className="whitespace-nowrap p-1 text-xs sm:p-2 sm:text-sm">{armor.名称}</td>
                    <td className="whitespace-nowrap p-1 text-xs sm:p-2 sm:text-sm">
                      {LEVEL_LABELS[armor.等级]}
                    </td>
                    <td className="whitespace-nowrap p-1 text-xs sm:p-2 sm:text-sm">{armor.伤害阈值}</td>
                    <td className="whitespace-nowrap p-1 text-xs sm:p-2 sm:text-sm">{armor.护甲值}</td>
                    <td className="whitespace-nowrap p-1 text-xs sm:p-2 sm:text-sm">{armor.特性名称}</td>
                    <td className="whitespace-nowrap p-1 text-xs sm:p-2 sm:text-sm">{armor.描述}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>,
    document.body,
  )
}
