"use client"

import { useMemo, useState } from "react"
import type { SheetData, AttributeValue } from "@/lib/sheet-data"
import { getDisplayedAttributeValue } from "@/lib/preset-equipment"
import { useSheetStore } from "@/lib/sheet-store"

type AttributeKey = keyof Pick<SheetData, "agility" | "strength" | "finesse" | "instinct" | "presence" | "knowledge">

const ATTRIBUTE_CONFIG: Array<{ name: string; key: AttributeKey; skills: string[] }> = [
  { name: "敏捷", key: "agility", skills: ["冲刺", "跳跃", "机动"] },
  { name: "力量", key: "strength", skills: ["举起", "猛击", "擒抱"] },
  { name: "灵巧", key: "finesse", skills: ["控制", "隐藏", "巧手"] },
  { name: "本能", key: "instinct", skills: ["感知", "察觉", "导航"] },
  { name: "风度", key: "presence", skills: ["魅力", "表演", "欺骗"] },
  { name: "知识", key: "knowledge", skills: ["回忆", "分析", "理解"] },
]

function isAttributeValue(val: unknown): val is AttributeValue {
  return val !== undefined && typeof val === "object" && val !== null && "checked" in val && "value" in val
}

function canCommitAttributeInput(value: string): boolean {
  const trimmed = value.trim()

  if (!trimmed) {
    return true
  }

  // Allow users to type incomplete expressions like "-" without immediately normalizing to 0.
  if (/^[+\-]$/.test(trimmed)) {
    return false
  }

  if (/[+\-*/.(]$/.test(trimmed)) {
    return false
  }

  const openingParens = (trimmed.match(/\(/g) || []).length
  const closingParens = (trimmed.match(/\)/g) || []).length
  return openingParens === closingParens
}

export function AttributesSection() {
  const { sheetData: formData, updateAttribute, toggleAttributeChecked, setSheetData } = useSheetStore()
  const [draftValues, setDraftValues] = useState<Partial<Record<AttributeKey, string>>>({})

  const handleAttributeValueChange = (attribute: keyof SheetData, value: string) => {
    updateAttribute(attribute, value)
  }

  const handleBooleanChange = (field: keyof SheetData) => {
    toggleAttributeChecked(field)
  }

  const handleSpellcastingToggle = (attribute: keyof SheetData) => {
    setSheetData((prev) => {
      const currentAttribute = prev[attribute]
      if (typeof currentAttribute === "object" && currentAttribute !== null && "spellcasting" in currentAttribute) {
        return {
          ...prev,
          [attribute]: {
            ...currentAttribute,
            spellcasting: !currentAttribute.spellcasting,
          },
        }
      }
      return prev
    })
  }

  const displayedValues = useMemo(() => {
    const values = {} as Record<AttributeKey, string>

    ATTRIBUTE_CONFIG.forEach((attr) => {
      const attrValue = formData[attr.key]
      values[attr.key] = isAttributeValue(attrValue)
        ? getDisplayedAttributeValue(formData, attr.key, attrValue.value)
        : ""
    })

    return values
  }, [formData])

  const handleAttributeInputChange = (attribute: AttributeKey, value: string) => {
    setDraftValues((prev) => ({ ...prev, [attribute]: value }))

    if (canCommitAttributeInput(value)) {
      handleAttributeValueChange(attribute, value)
    }
  }

  const handleAttributeInputBlur = (attribute: AttributeKey) => {
    const draftValue = draftValues[attribute]
    if (draftValue === undefined) {
      return
    }

    if (canCommitAttributeInput(draftValue)) {
      handleAttributeValueChange(attribute, draftValue)
    }

    setDraftValues((prev) => {
      const next = { ...prev }
      delete next[attribute]
      return next
    })
  }

  return (
    <div className="mt-2.5">
      <div className="grid grid-cols-3 gap-x-2 gap-y-1">
        {ATTRIBUTE_CONFIG.map((attr) => (
          <div key={attr.name} className="flex flex-col items-center">
            <div className="flex items-center justify-between w-full bg-gray-800 text-white px-1 rounded-t-md py-0.5">
              <div className="flex items-center">
                <div className="text-[12px] font-bold">{attr.name}</div>
                {(() => {
                  const attrValue = formData[attr.key]
                  const isSpellcasting = isAttributeValue(attrValue) && attrValue.spellcasting

                  return (
                    <button
                      type="button"
                      onClick={() => handleSpellcastingToggle(attr.key)}
                      className={`ml-1 text-[14px] font-bold cursor-pointer transition-colors hover:scale-110 ${isSpellcasting ? "text-white" : "text-gray-600 print:hidden"}`}
                      title="施法属性标记"
                      aria-label="施法属性标记"
                    >
                      ✦
                    </button>
                  )
                })()}
              </div>
              {(() => {
                const attrValue = formData[attr.key]

                return (
                  <div
                    className={`w-2 h-2 rounded-full border border-white cursor-pointer ${isAttributeValue(attrValue) && attrValue.checked ? "bg-gray-800" : "bg-white"}`}
                    onClick={() => handleBooleanChange(attr.key)}
                  />
                )
              })()}
            </div>
            <div className="w-full h-14 relative">
              <div className="absolute inset-0 rounded-b-md bg-white border border-t-0 border-gray-800 flex flex-col items-center justify-center">
                <input
                  type="text"
                  value={draftValues[attr.key] ?? displayedValues[attr.key]}
                  onChange={(e) => handleAttributeInputChange(attr.key, e.target.value)}
                  onBlur={() => handleAttributeInputBlur(attr.key)}
                  className="w-16 text-center bg-transparent border-b border-gray-400 focus:outline-none text-lg font-bold text-gray-800 print-empty-hide"
                />
                <div className="text-[8px] text-center text-gray-600">{attr.skills.join(", ")}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
