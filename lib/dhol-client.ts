import type { SheetData } from '@/lib/sheet-data'
import { buildDholDesktopView } from '@/lib/dhol-desktop-view'

export const DEFAULT_DHOL_BASE_URL =
  process.env.NEXT_PUBLIC_DHOL_URL || 'https://dhol-realtime.gooole-dql.workers.dev'
export const DHOL_ROOM_CODE_LENGTH = 6

export interface DholSendResult {
  ok: true
  action: 'created' | 'updated'
  name: string
  generation: number
  seq: number
}

export interface DholSendOptions {
  baseUrl?: string
  roomCode: string
  idempotencyKey: string
  sheetData: SheetData
}

export function normalizeDholRoomCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

function errorMessage(code: unknown): string {
  switch (code) {
    case 'ROOM_NOT_FOUND': return '房间不存在，请检查房间码'
    case 'ROOM_EXPIRED': return '房间已过期，请向主持人获取新房间码'
    case 'INVALID_CHARACTER': return '角色数据无效，请检查角色名和资源栏'
    case 'UNSUPPORTED_SCHEMA': return '角色数据版本不受支持，请刷新建卡器后重试'
    case 'PAYLOAD_TOO_LARGE': return '角色数据过大，请缩小图片或精简内容'
    case 'RATE_LIMITED': return '投递请求过于频繁，请稍候重试'
    case 'PERSISTENCE_FAILED': return '房间保存失败，请使用同一表单重试'
    case 'ORIGIN_NOT_ALLOWED': return '当前建卡器地址未被桌面房间允许'
    default: return '桌面房间拒绝了角色投递'
  }
}

function isDholSendResult(value: unknown): value is DholSendResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Record<string, unknown>
  return result.ok === true &&
    (result.action === 'created' || result.action === 'updated') &&
    typeof result.name === 'string' && result.name.trim().length > 0 &&
    typeof result.generation === 'number' && Number.isFinite(result.generation) && Number.isInteger(result.generation) && result.generation >= 0 &&
    typeof result.seq === 'number' && Number.isFinite(result.seq) && Number.isInteger(result.seq) && result.seq >= 0
}

export async function sendCharacterToDhol({
  baseUrl = DEFAULT_DHOL_BASE_URL,
  roomCode,
  idempotencyKey,
  sheetData,
}: DholSendOptions): Promise<DholSendResult> {
  const normalizedCode = normalizeDholRoomCode(roomCode)
  if (normalizedCode.length !== DHOL_ROOM_CODE_LENGTH) {
    throw new Error('房间码必须为 6 位英文字母或数字')
  }
  if (!sheetData.name?.trim()) throw new Error('角色名不能为空，请先填写角色名')
  if (!/^[\w-]{1,128}$/.test(idempotencyKey)) throw new Error('投递请求 ID 无效')

  const endpoint = `${baseUrl.trim().replace(/\/+$/, '')}/api/v2/rooms/${normalizedCode}/characters`
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ schemaVersion: 2, sheet: { ...sheetData, desktopView: buildDholDesktopView(sheetData) } }),
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`无法连接到桌面房间（${detail}），请检查网络或服务器地址`)
  }

  let result: unknown
  try {
    result = await response.json()
  } catch {
    throw new Error(`桌面房间响应异常（HTTP ${response.status}）`)
  }
  if (!response.ok) {
    const code = result && typeof result === 'object' && 'code' in result ? result.code : undefined
    throw new Error(errorMessage(code))
  }
  if (!isDholSendResult(result)) throw new Error('桌面房间响应异常（成功响应格式无效）')
  return result
}
