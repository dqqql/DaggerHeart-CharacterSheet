"use client"

import { useState, useEffect } from "react"
import { Loader2, Send, AlertCircle, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { showFadeNotification } from "@/components/ui/fade-notification"
import { getRuleSetModule } from "@/lib/rulesets/registry"
import type { SheetData } from "@/lib/sheet-data"
import {
  DEFAULT_ZOOT_BASE_URL,
  formatRoomCodeDisplay,
  normalizeRoomCode,
  sendCharacterToZoot,
  ZOOT_ROOM_CODE_LENGTH,
} from "@/lib/zoot-client"

const STORAGE_KEY_ROOM_CODE = "zoot_last_room_code"
const STORAGE_KEY_SERVER_URL = "zoot_server_url"

export interface ZootExportModalProps {
  isOpen: boolean
  onClose: () => void
  sheetData: SheetData
}

export function ZootExportModal({
  isOpen,
  onClose,
  sheetData,
}: ZootExportModalProps) {
  const [roomCode, setRoomCode] = useState("")
  const [serverUrl, setServerUrl] = useState(DEFAULT_ZOOT_BASE_URL)
  const [showServerSettings, setShowServerSettings] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 弹窗打开时恢复上次使用的房间码和服务器地址
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setIsSending(false)
      try {
        const savedCode = localStorage.getItem(STORAGE_KEY_ROOM_CODE)
        if (savedCode) {
          setRoomCode(formatRoomCodeDisplay(savedCode))
        }
        const savedUrl = localStorage.getItem(STORAGE_KEY_SERVER_URL)
        if (savedUrl) {
          setServerUrl(savedUrl)
        } else {
          setServerUrl(DEFAULT_ZOOT_BASE_URL)
        }
      } catch {
        // Ignore localStorage access errors
      }
    }
  }, [isOpen])

  const characterName = sheetData.name?.trim() || ""
  const normalizedCode = normalizeRoomCode(roomCode)
  const isValidCodeLength = normalizedCode.length === ZOOT_ROOM_CODE_LENGTH

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // 自动大写并规范化
    const normalized = normalizeRoomCode(value).slice(0, ZOOT_ROOM_CODE_LENGTH)
    if (normalized.length > 4) {
      setRoomCode(`${normalized.slice(0, 4)}-${normalized.slice(4)}`)
    } else {
      setRoomCode(normalized)
    }
    if (error) setError(null)
  }

  const handleSend = async () => {
    if (isSending) return

    if (!normalizedCode) {
      setError("请输入 8 位房间码")
      return
    }

    if (normalizedCode.length !== ZOOT_ROOM_CODE_LENGTH) {
      setError(`房间码必须为 8 位英数字符（当前为 ${normalizedCode.length} 位）`)
      return
    }

    if (!characterName) {
      setError("角色名不能为空，请先在角色卡上填写角色名")
      return
    }

    setIsSending(true)
    setError(null)

    try {
      const module = getRuleSetModule(sheetData.ruleSetId)
      const exportData = module.prepareForExport(sheetData)

      const result = await sendCharacterToZoot({
        baseUrl: serverUrl.trim() || DEFAULT_ZOOT_BASE_URL,
        roomCode: normalizedCode,
        sheetData: exportData,
      })

      // 记住房间码和服务器地址
      try {
        localStorage.setItem(STORAGE_KEY_ROOM_CODE, normalizedCode)
        if (serverUrl.trim() && serverUrl.trim() !== DEFAULT_ZOOT_BASE_URL) {
          localStorage.setItem(STORAGE_KEY_SERVER_URL, serverUrl.trim())
        } else {
          localStorage.removeItem(STORAGE_KEY_SERVER_URL)
        }
      } catch {
        // Ignore localStorage write errors
      }

      const actionText = result.action === "created" ? "已投递" : "已更新"
      showFadeNotification({
        message: `角色【${result.characterName}】${actionText}到 ZOOT 房间！`,
        type: "success",
        duration: 3000,
      })

      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : "ZOOT 投递失败"
      setError(message)
      showFadeNotification({
        message,
        type: "error",
        duration: 4000,
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSending && isValidCodeLength) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSending && onClose()}>
      <DialogContent
        className="max-w-md"
        aria-describedby={undefined}
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Send className="h-5 w-5 text-primary" />
            发送角色到 ZOOT
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 角色提示 */}
          <div className="rounded-md border border-primary/30 bg-primary/10 p-2.5 text-sm text-foreground">
            <span>当前角色：<strong className="font-semibold">{characterName || "（未命名角色）"}</strong></span>
          </div>

          {!characterName && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span>注意：角色名目前为空，投递前请先在角色卡头部填写角色名。</span>
            </div>
          )}

          {/* 房间码输入框 */}
          <div className="space-y-2">
            <Label htmlFor="zoot-room-code" className="text-sm font-medium">
              房间码 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="zoot-room-code"
              data-testid="zoot-room-code-input"
              value={roomCode}
              onChange={handleRoomCodeChange}
              placeholder="例如 ABCD-EFGH"
              autoFocus
              disabled={isSending}
              maxLength={9}
              className="font-mono text-center tracking-widest uppercase text-base h-11"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div
              data-testid="zoot-export-error"
              className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
              <span className="break-all">{error}</span>
            </div>
          )}

          {/* 服务器地址高级配置 */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowServerSettings(!showServerSettings)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>{showServerSettings ? "收起服务器设置" : "自定义服务器地址"}</span>
            </button>

            {showServerSettings && (
              <div className="mt-2 space-y-1.5 rounded-md border p-2.5 bg-muted/30">
                <Label htmlFor="zoot-server-url" className="text-xs text-muted-foreground">
                  ZOOT 服务器地址
                </Label>
                <div className="flex gap-1.5">
                  <Input
                    id="zoot-server-url"
                    data-testid="zoot-server-url-input"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder={DEFAULT_ZOOT_BASE_URL}
                    disabled={isSending}
                    className="h-8 text-xs font-mono"
                  />
                  {serverUrl !== DEFAULT_ZOOT_BASE_URL && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setServerUrl(DEFAULT_ZOOT_BASE_URL)}
                      className="h-8 px-2 text-xs"
                      title="重置为默认地址"
                    >
                      重置
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSending}
            data-testid="zoot-cancel-button"
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={isSending || !isValidCodeLength}
            data-testid="zoot-send-button"
            className="gap-1.5"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                发送中...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                发送
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
