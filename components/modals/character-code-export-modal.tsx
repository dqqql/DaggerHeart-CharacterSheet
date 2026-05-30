"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface CharacterCodeExportModalProps {
  isOpen: boolean
  onClose: () => void
  getCharacterCode: () => string
}

export function CharacterCodeExportModal({
  isOpen,
  onClose,
  getCharacterCode,
}: CharacterCodeExportModalProps) {
  const [copySuccess, setCopySuccess] = useState(false)

  const { code, error } = useMemo(() => {
    if (!isOpen) {
      return { code: "", error: null as string | null }
    }

    try {
      return { code: getCharacterCode(), error: null as string | null }
    } catch (cause) {
      return {
        code: "",
        error: cause instanceof Error ? cause.message : "角色码生成失败。",
      }
    }
  }, [getCharacterCode, isOpen])

  const handleCopy = async () => {
    if (!code) {
      return
    }

    try {
      await navigator.clipboard.writeText(code)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
      return
    } catch (cause) {
      console.error("复制角色码失败:", cause)
    }

    const textarea = document.getElementById("character-code-export-textarea") as HTMLTextAreaElement | null
    if (!textarea) {
      return
    }

    textarea.select()
    document.execCommand("copy")
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const handleTextareaClick = (event: React.MouseEvent<HTMLTextAreaElement>) => {
    event.currentTarget.select()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="character-code-modal-title">导出角色码</DialogTitle>
          <DialogDescription>
            生成一个便于复制分享的短码。v1 仅支持内置领域卡，不包含当前资源消耗状态。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <>
              <Textarea
                id="character-code-export-textarea"
                value={code}
                readOnly
                onClick={handleTextareaClick}
                className="min-h-[180px] cursor-pointer resize-none font-mono text-sm"
                placeholder="生成的角色码会显示在这里。"
              />

              <div className="flex justify-center">
                <Button
                  data-testid="character-code-copy-button"
                  onClick={handleCopy}
                  variant={copySuccess ? "default" : "outline"}
                >
                  {copySuccess ? "已复制到剪贴板" : "复制角色码"}
                </Button>
              </div>
            </>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">当前版本包含的内容</p>
            <p>等级、熟练度、闪避、护甲、六项属性、伤害阈值、希望上限、压力上限、金币上限，以及聚焦卡组中的内置领域卡。</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
