'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Send, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getRuleSetModule } from '@/lib/rulesets/registry'
import type { SheetData } from '@/lib/sheet-data'
import {
  DEFAULT_DHOL_BASE_URL,
  DHOL_ROOM_CODE_LENGTH,
  normalizeDholRoomCode,
  sendCharacterToDhol,
} from '@/lib/dhol-client'

const STORAGE_KEY_ROOM_CODE = 'dhol_last_room_code'
const STORAGE_KEY_SERVER_URL = 'dhol_server_url'

export interface DholExportModalProps {
  isOpen: boolean
  onClose: () => void
  sheetData: SheetData
}

export function DholExportModal({ isOpen, onClose, sheetData }: DholExportModalProps) {
  const [roomCode, setRoomCode] = useState('')
  const [serverUrl, setServerUrl] = useState(DEFAULT_DHOL_BASE_URL)
  const [showServerSettings, setShowServerSettings] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const retryId = useRef<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setResult(null)
    setIsSending(false)
    retryId.current = null
    try {
      setRoomCode(localStorage.getItem(STORAGE_KEY_ROOM_CODE) ?? '')
      setServerUrl(localStorage.getItem(STORAGE_KEY_SERVER_URL) ?? DEFAULT_DHOL_BASE_URL)
    } catch {
      setServerUrl(DEFAULT_DHOL_BASE_URL)
    }
  }, [isOpen])

  const characterName = sheetData.name?.trim() || ''
  const normalizedCode = normalizeDholRoomCode(roomCode)
  const canSend = normalizedCode.length === DHOL_ROOM_CODE_LENGTH && !!characterName

  const handleSend = async () => {
    if (isSending || !canSend) return
    const requestId = retryId.current ?? crypto.randomUUID()
    retryId.current = requestId
    setIsSending(true)
    setError(null)
    setResult(null)
    try {
      const prepared = getRuleSetModule(sheetData.ruleSetId).prepareForExport(sheetData)
      const response = await sendCharacterToDhol({
        baseUrl: serverUrl.trim() || DEFAULT_DHOL_BASE_URL,
        roomCode: normalizedCode,
        idempotencyKey: requestId,
        sheetData: prepared,
      })
      try {
        localStorage.setItem(STORAGE_KEY_ROOM_CODE, normalizedCode)
        localStorage.setItem(STORAGE_KEY_SERVER_URL, serverUrl.trim() || DEFAULT_DHOL_BASE_URL)
      } catch {
        // Delivery succeeded even if browser storage is unavailable.
      }
      setResult(`${response.action === 'created' ? '已新增' : '已覆盖'}：${response.name}`)
      retryId.current = null
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '角色投递失败')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && !isSending && onClose()}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Send className="h-5 w-5 text-primary" />
            发送到桌面房间
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border border-primary/30 bg-primary/10 p-2.5 text-sm">
            当前角色：<strong>{characterName || '（未命名角色）'}</strong>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            同名角色的全部数据和资源都会被本次角色卡完整覆盖。
          </p>

          <div className="space-y-2">
            <Label htmlFor="dhol-room-code">房间码</Label>
            <Input
              id="dhol-room-code"
              value={roomCode}
              onChange={event => {
                setRoomCode(normalizeDholRoomCode(event.target.value).slice(0, DHOL_ROOM_CODE_LENGTH))
                setError(null)
                setResult(null)
              }}
              placeholder="例如 ABC123"
              autoFocus
              disabled={isSending}
              maxLength={DHOL_ROOM_CODE_LENGTH}
              className="h-11 text-center font-mono text-base uppercase tracking-widest"
            />
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {result && (
            <div role="status" className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{result}</span>
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => setShowServerSettings(value => !value)}
              aria-expanded={showServerSettings}
              aria-controls="dhol-server-settings"
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {showServerSettings ? '收起服务器设置' : '自定义服务器地址'}
            </button>
            {showServerSettings && (
              <div id="dhol-server-settings" className="mt-2 space-y-1.5 rounded-md border bg-muted/30 p-2.5">
                <Label htmlFor="dhol-server-url">桌面房间服务器地址</Label>
                <Input
                  id="dhol-server-url"
                  value={serverUrl}
                  onChange={event => setServerUrl(event.target.value)}
                  disabled={isSending}
                  className="h-8 font-mono text-xs"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSending}>关闭</Button>
          <Button type="button" onClick={() => void handleSend()} disabled={isSending || !canSend} className="gap-1.5">
            {isSending ? <><Loader2 className="h-4 w-4 animate-spin" />发送中...</> : <><Send className="h-4 w-4" />发送</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
