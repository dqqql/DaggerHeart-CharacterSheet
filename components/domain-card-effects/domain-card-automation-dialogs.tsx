"use client"

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { SheetData } from "@/lib/sheet-data"

type VitalityChoice = "hp" | "stress" | "threshold"
type MasterMode = "two-plus-two" | "one-plus-three"

interface VitalityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (choices: VitalityChoice[]) => void
}

const VITALITY_OPTIONS: Array<{ id: VitalityChoice; label: string; description: string }> = [
  { id: "stress", label: "+1 压力槽", description: "永久增加 1 个压力槽上限。" },
  { id: "hp", label: "+1 生命槽", description: "永久增加 1 个生命槽上限。" },
  { id: "threshold", label: "全部伤害阈值 +2", description: "永久让重度和严重伤害阈值都获得 +2。" },
]

export function VitalityChoiceDialog({ open, onOpenChange, onConfirm }: VitalityDialogProps) {
  const [selected, setSelected] = useState<VitalityChoice[]>([])

  const toggleChoice = (choice: VitalityChoice) => {
    setSelected((prev) => {
      if (prev.includes(choice)) {
        return prev.filter((item) => item !== choice)
      }

      if (prev.length >= 2) {
        return prev
      }

      return [...prev, choice]
    })
  }

  const handleConfirm = () => {
    if (selected.length !== 2) {
      return
    }

    onConfirm(selected)
    setSelected([])
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelected([])
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>蓬勃生命</DialogTitle>
          <DialogDescription>从下面三项里选择两项永久获得。</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {VITALITY_OPTIONS.map((option) => {
            const checked = selected.includes(option.id)
            const disabled = selected.length >= 2 && !checked

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => !disabled && toggleChoice(option.id)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  checked
                    ? "border-blue-500 bg-blue-50"
                    : disabled
                      ? "border-gray-200 bg-gray-50 text-gray-400"
                      : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="text-sm font-semibold">{option.label}</div>
                <div className="mt-1 text-xs text-gray-600">{option.description}</div>
              </button>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={selected.length !== 2}>
            应用效果
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface MasterOfTheCraftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: SheetData
  onConfirm: (payload: { mode: MasterMode; indices: number[] }) => void
}

export function MasterOfTheCraftDialog({
  open,
  onOpenChange,
  formData,
  onConfirm,
}: MasterOfTheCraftDialogProps) {
  const availableExperiences = useMemo(
    () =>
      (formData.experience || [])
        .map((content, index) => ({
          index,
          content,
          value: formData.experienceValues?.[index] || "",
        }))
        .filter((item) => item.content.trim() !== ""),
    [formData.experience, formData.experienceValues],
  )
  const [mode, setMode] = useState<MasterMode>("two-plus-two")
  const [selected, setSelected] = useState<number[]>([])

  const requiredCount = mode === "two-plus-two" ? 2 : 1

  const toggleExperience = (index: number) => {
    setSelected((prev) => {
      if (prev.includes(index)) {
        return prev.filter((item) => item !== index)
      }

      if (prev.length >= requiredCount) {
        return prev
      }

      return [...prev, index]
    })
  }

  const handleModeChange = (nextMode: MasterMode) => {
    setMode(nextMode)
    setSelected([])
  }

  const handleConfirm = () => {
    if (selected.length !== requiredCount) {
      return
    }

    onConfirm({ mode, indices: selected })
    setSelected([])
    setMode("two-plus-two")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelected([])
      setMode("two-plus-two")
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>技艺大师</DialogTitle>
          <DialogDescription>选择要永久提升的经历，然后这张卡会自动移入宝库。</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleModeChange("two-plus-two")}
              className={`rounded-lg border p-3 text-left transition-colors ${
                mode === "two-plus-two" ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="text-sm font-semibold">两项经历 +2</div>
              <div className="mt-1 text-xs text-gray-600">选择 2 项经历，各自永久 +2。</div>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("one-plus-three")}
              className={`rounded-lg border p-3 text-left transition-colors ${
                mode === "one-plus-three" ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="text-sm font-semibold">一项经历 +3</div>
              <div className="mt-1 text-xs text-gray-600">选择 1 项经历，永久 +3。</div>
            </button>
          </div>

          <div className="text-xs text-gray-600">
            已选择 {selected.length}/{requiredCount}
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {availableExperiences.length > 0 ? (
              availableExperiences.map((item) => {
                const checked = selected.includes(item.index)
                const disabled = selected.length >= requiredCount && !checked

                return (
                  <button
                    key={item.index}
                    type="button"
                    onClick={() => !disabled && toggleExperience(item.index)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      checked
                        ? "border-blue-500 bg-blue-50"
                        : disabled
                          ? "border-gray-200 bg-gray-50 text-gray-400"
                          : "border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{item.content}</span>
                      <span className="text-xs text-gray-500">当前 {item.value || "0"}</span>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
                需要至少填写一项经历，才能应用这张卡的效果。
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={selected.length !== requiredCount || availableExperiences.length === 0}>
            应用效果
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
