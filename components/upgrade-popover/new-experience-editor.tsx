"use client"

import { useState } from "react"
import { useSheetStore } from "@/lib/sheet-store"
import { X, Check } from "lucide-react"
import { showFadeNotification } from "@/components/ui/fade-notification"

interface NewExperienceEditorProps {
  onClose?: () => void
}

export function NewExperienceEditor({ onClose }: NewExperienceEditorProps) {
  const { sheetData, setSheetData } = useSheetStore()

  const experience = sheetData.experience || ["", "", "", "", ""]
  const experienceValues = sheetData.experienceValues || ["", "", "", "", ""]

  // 查找第一个空经历位置
  const findEmptySlot = (): number => {
    for (let i = 0; i < experience.length; i++) {
      if (experience[i] === "" && experienceValues[i] === "") {
        return i
      }
    }
    return -1
  }

  const emptySlotIndex = findEmptySlot()
  const hasEmptySlot = emptySlotIndex !== -1

  // 本地状态管理
  const [newContent, setNewContent] = useState("")
  const [newValue, setNewValue] = useState("+2")

  const handleConfirm = () => {
    if (!hasEmptySlot || !newContent.trim()) return

    // 更新经历内容
    const newExperience = [...experience]
    newExperience[emptySlotIndex] = newContent.trim()

    // 更新经历加值
    const newExperienceValues = [...experienceValues]
    newExperienceValues[emptySlotIndex] = newValue

    setSheetData({
      experience: newExperience,
      experienceValues: newExperienceValues
    })

    // 显示成功通知
    showFadeNotification({
      message: `已添加新经历：${newContent.trim()}`,
      type: "success",
      position: "middle"
    })

    // 关闭气泡
    onClose?.()
  }

  const canConfirm = hasEmptySlot && newContent.trim() !== ""

  return (
    <div className="w-48 text-popover-foreground">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-popover-foreground">添加新经历</span>
        <button
          onClick={onClose}
          className="p-0.5 text-popover-foreground/70 hover:bg-accent hover:text-accent-foreground rounded transition-colors"
          title="关闭"
          aria-label="关闭添加经历"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* 提示信息 */}
      <div className="mb-2 px-2 py-1.5 bg-blue-50 border border-blue-200 rounded">
        <p className="text-[10px] text-blue-700 leading-relaxed">
          💡 熟练值会在更新等级时自动更新
        </p>
      </div>

      {!hasEmptySlot ? (
        <div className="text-xs text-popover-foreground/80 py-4 text-center bg-accent rounded border border-border">
          所有经历位已满，请先清空一个位置
        </div>
      ) : (
        <>
          <div className="mb-3">
            <label htmlFor="new-experience-content" className="block text-xs text-popover-foreground/80 mb-1">经历内容</label>
            <input
              id="new-experience-content"
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="输入新的经历..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canConfirm) {
                  handleConfirm()
                }
              }}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="new-experience-value" className="block text-xs text-popover-foreground/80 mb-1">经历加值</label>
            <input
              id="new-experience-value"
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="w-full bg-white px-2 py-1.5 text-xs text-center text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="+2"
            />
          </div>

          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full py-2 text-xs font-semibold rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
          >
            <Check className="w-3 h-3" />
            添加经历
          </button>
        </>
      )}
    </div>
  )
}
