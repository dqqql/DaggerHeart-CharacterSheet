"use client"

import type React from "react"
import { useSheetStore, useSafeSheetData } from "@/lib/sheet-store"
import {
  calculateDamageThresholdBreakdown,
  convertDisplayedDamageThresholdToManualModifier,
} from "@/lib/domain-card-derived-stats"
import { StatSourcePopover } from "@/components/ui/stat-source-popover"

export function HitPointsSection() {
  const setSheetData = useSheetStore((state) => state.setSheetData)
  const safeFormData = useSafeSheetData()
  const thresholdBreakdown = calculateDamageThresholdBreakdown(safeFormData)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    if (name === "minorThreshold") {
      setSheetData((prev) => ({
        ...prev,
        minorThresholdManualModifier: convertDisplayedDamageThresholdToManualModifier(safeFormData, "minor", value),
      }))
      return
    }

    if (name === "majorThreshold") {
      setSheetData((prev) => ({
        ...prev,
        majorThresholdManualModifier: convertDisplayedDamageThresholdToManualModifier(safeFormData, "major", value),
      }))
      return
    }

    setSheetData((prev) => ({ ...prev, [name]: value }))
  }

  const handleMaxChange = (field: "hp" | "stress", value: string) => {
    const maxField = `${field}Max` as "hpMax" | "stressMax"
    const currentField = field

    if (value === "") {
      setSheetData((prev) => ({ ...prev, [maxField]: undefined }))
      return
    }

    if (!/^\d+$/.test(value)) return

    const intValue = parseInt(value) || 0
    if (intValue > 18) return

    setSheetData((prev) => {
      const newSheetData = { ...prev, [maxField]: intValue }
      const currentArray = (newSheetData[currentField] as boolean[]) || []
      const checkedCount = currentArray.filter(Boolean).length

      if (checkedCount > intValue) {
        const newArray = Array(currentArray.length).fill(false)
        for (let i = 0; i < intValue; i++) {
          newArray[i] = true
        }
        newSheetData[currentField] = newArray
      }

      return newSheetData
    })
  }

  const handleIncreaseMax = (field: "hp" | "stress") => {
    const maxField = `${field}Max` as "hpMax" | "stressMax"
    const currentMax = safeFormData[maxField] || 6
    if (currentMax < 18) {
      handleMaxChange(field, String(currentMax + 1))
    }
  }

  const handleDecreaseMax = (field: "hp" | "stress") => {
    const maxField = `${field}Max` as "hpMax" | "stressMax"
    const currentMax = safeFormData[maxField] || 6
    if (currentMax > 1) {
      handleMaxChange(field, String(currentMax - 1))
    }
  }

  const renderBoxes = (field: "hp" | "stress", max: number, total: number) => {
    const fieldArray = Array.isArray(safeFormData[field]) ? (safeFormData[field] as boolean[]) : Array(total).fill(false)

    const handleClick = (index: number) => {
      const newFieldData = [...fieldArray]
      const lastCheckedIndex = fieldArray.lastIndexOf(true)

      if (lastCheckedIndex === index) {
        for (let i = 0; i < newFieldData.length; i++) {
          newFieldData[i] = false
        }
      } else {
        for (let i = 0; i < newFieldData.length; i++) {
          newFieldData[i] = i <= index
        }
      }

      setSheetData((prev) => ({ ...prev, [field]: newFieldData }))
    }

    return (
      <div className="flex gap-1 flex-wrap">
        {Array(total)
          .fill(0)
          .map((_, i) => {
            const isWithinMax = i < max
            const isChecked = fieldArray[i] || false

            return (
              <div
                key={`${String(field)}-${i}`}
                className={`w-4 h-4 border-2 ${
                  isWithinMax ? "border-gray-800 cursor-pointer" : "border-gray-400 border-dashed"
                } ${isChecked ? "bg-gray-800" : "bg-white"} ${i > 0 && i % 6 === 0 ? "ml-1" : ""}`}
                onClick={() => {
                  if (isWithinMax) {
                    handleClick(i)
                  }
                }}
              />
            )
          })}
      </div>
    )
  }

  return (
    <div className="py-1 mb-1 print:mt-1.5">
      <h3 className="text-xs font-bold text-center mb-2.5">生命点与压力点</h3>

      <div className="flex justify-between items-center gap-1">
        <div className="bg-gray-800 text-white text-[10px] p-1 text-center rounded-md flex-1">
          <div>轻度伤害</div>
          <div className="text-[8px] mt-0.5 text-gray-300">标记 1 生命点</div>
        </div>
        <input
          type="text"
          name="minorThreshold"
          value={safeFormData.minorThreshold || ""}
          onChange={handleInputChange}
          className="w-10 text-center text-m border border-gray-400 rounded mx-1 print-empty-hide"
        />
        <div className="bg-gray-800 text-white text-[10px] p-1 text-center rounded-md flex-1">
          <div className="flex items-center justify-center gap-1">
            <span>重度伤害</span>
            <StatSourcePopover
              title="重度伤害阈值"
              value={thresholdBreakdown.minor.display}
              sources={thresholdBreakdown.minor.sources}
            />
          </div>
          <div className="text-[8px] mt-0.5 text-gray-300">标记 2 生命点</div>
        </div>
        <input
          type="text"
          name="majorThreshold"
          value={safeFormData.majorThreshold || ""}
          onChange={handleInputChange}
          className="w-10 text-center text-m border border-gray-400 rounded mx-1 print-empty-hide"
        />
        <div className="bg-gray-800 text-white text-[10px] p-1 text-center rounded-md flex-1">
          <div className="flex items-center justify-center gap-1">
            <span>严重伤害</span>
            <StatSourcePopover
              title="严重伤害阈值"
              value={thresholdBreakdown.major.display}
              sources={thresholdBreakdown.major.sources}
            />
          </div>
          <div className="text-[8px] mt-0.5 text-gray-300">标记 3 生命点</div>
        </div>
      </div>

      <div className="mt-1 space-y-1">
        <div className="flex items-center justify-between group">
          <span className="font-bold mr-2 text-xs">
            生命点
            {safeFormData.cards?.[0]?.professionSpecial?.["起始生命"] && (
              <span className="text-[10px] text-gray-600 ml-1">
                (职业初始: {safeFormData.cards?.[0]?.professionSpecial?.["起始生命"] ?? "未知"})
              </span>
            )}
          </span>
          <div className="flex items-center">
            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 print:hidden">
              <button
                onClick={() => handleDecreaseMax("hp")}
                disabled={(safeFormData.hpMax || 6) <= 1}
                className="w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-base sm:text-sm text-gray-400 sm:text-gray-800 transition-colors"
                title="减少生命点上限"
              >
                -
              </button>
              <button
                onClick={() => handleIncreaseMax("hp")}
                disabled={(safeFormData.hpMax || 6) >= 18}
                className="w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-base sm:text-sm text-gray-400 sm:text-gray-800 transition-colors"
                title="增加生命点上限"
              >
                +
              </button>
            </div>

            <span className="text-[9px] mr-1 print:hidden">最大值</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={safeFormData.hpMax ?? ""}
              onChange={(e) => handleMaxChange("hp", e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="6"
              className="w-8 text-center border border-gray-400 rounded text-xs print:hidden"
            />
          </div>
        </div>
        {renderBoxes("hp", Number(safeFormData.hpMax || safeFormData.cards?.[0]?.professionSpecial?.["起始生命"] || 6), 18)}

        <div className="flex items-center justify-between group">
          <span className="font-bold mr-2 text-xs">压力点</span>
          <div className="flex items-center">
            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 print:hidden">
              <button
                onClick={() => handleDecreaseMax("stress")}
                disabled={(safeFormData.stressMax || 6) <= 1}
                className="w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-base sm:text-sm text-gray-400 sm:text-gray-800 transition-colors"
                title="减少压力上限"
              >
                -
              </button>
              <button
                onClick={() => handleIncreaseMax("stress")}
                disabled={(safeFormData.stressMax || 6) >= 18}
                className="w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-base sm:text-sm text-gray-400 sm:text-gray-800 transition-colors"
                title="增加压力上限"
              >
                +
              </button>
            </div>

            <span className="text-[9px] mr-1 print:hidden">最大值</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={safeFormData.stressMax ?? ""}
              onChange={(e) => handleMaxChange("stress", e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="6"
              className="w-8 text-center border border-gray-400 rounded text-xs print:hidden"
            />
          </div>
        </div>
        {renderBoxes("stress", Number(safeFormData.stressMax || 6), 18)}
      </div>
    </div>
  )
}
