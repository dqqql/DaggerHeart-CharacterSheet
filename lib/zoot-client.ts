import type { SheetData } from "@/lib/sheet-data"

export const DEFAULT_ZOOT_BASE_URL =
  process.env.NEXT_PUBLIC_ZOOT_URL || "https://zootos.pages.dev"

export const ZOOT_ROOM_CODE_LENGTH = 8

export interface ZootSendResult {
  ok: true
  action: "created" | "updated"
  characterName: string
  receivedAt: string
}

export interface ZootSendOptions {
  baseUrl?: string
  roomCode: string
  sheetData: SheetData
}

/**
 * 标准化房间码：过滤非英数符号并转为大写
 * 例如 "abcd-efgh" -> "ABCDEFGH"
 */
export function normalizeRoomCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
}

/**
 * 格式化房间码展示（如 ABCD-EFGH）
 */
export function formatRoomCodeDisplay(code: string): string {
  const normalized = normalizeRoomCode(code)
  if (normalized.length <= 4) {
    return normalized
  }
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}`
}

export function validateZootCharacter(sheetData: SheetData): void {
  if (sheetData.ruleSetId !== "rhodes-island") {
    throw new Error("ZOOT 投递仅支持罗德岛模式角色卡")
  }

  const name = sheetData.name?.trim()
  if (!name) {
    throw new Error("角色名不能为空，请先在角色卡上填写角色名")
  }

  if (name.length > 80) {
    throw new Error("角色名过长，最多 80 个字符")
  }
}

/**
 * 发送角色卡数据到 ZOOT 房间
 */
export async function sendCharacterToZoot({
  baseUrl = DEFAULT_ZOOT_BASE_URL,
  roomCode,
  sheetData,
}: ZootSendOptions): Promise<ZootSendResult> {
  const normalizedCode = normalizeRoomCode(roomCode)
  if (normalizedCode.length !== ZOOT_ROOM_CODE_LENGTH) {
    throw new Error(
      `房间码必须为 8 位英文字母或数字（例如 ABCD-EFGH）`,
    )
  }

  validateZootCharacter(sheetData)

  const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, "")
  const endpoint = `${cleanBaseUrl}/api/v1/rooms/${normalizedCode}/characters`

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sheetData),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`无法连接到 ZOOT 服务器 (${message})，请检查网络或服务器地址`)
  }

  let result: any
  try {
    result = await response.json()
  } catch {
    throw new Error(`ZOOT 服务器响应异常 (HTTP ${response.status})`)
  }

  if (!response.ok || !result?.ok) {
    const error = result?.error
    const code = error?.code

    if (code === "ROOM_NOT_FOUND") {
      throw new Error("房间不存在或已关闭，请检查房间码或联系主持人 (GM)")
    }
    if (code === "INVALID_ORIGIN") {
      throw new Error("当前站点未列入 ZOOT 允许来源 (MYDH_ALLOWED_ORIGINS)")
    }
    if (code === "PAYLOAD_TOO_LARGE") {
      throw new Error("角色数据体积超过 512 KiB 限制，请尝试缩小头像或简化内容")
    }
    if (code === "RATE_LIMITED") {
      throw new Error("投递请求过于频繁，请稍候重试")
    }
    if (code === "STORAGE_UNAVAILABLE") {
      throw new Error("ZOOT 服务器存储暂时不可用，请稍后重试")
    }
    if (code === "UNSUPPORTED_RULESET") {
      throw new Error("ZOOT 仅支持接收罗德岛规则角色卡")
    }
    if (code === "INVALID_CHARACTER" && error?.fieldErrors) {
      const details = Object.entries(error.fieldErrors)
        .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
        .join("; ")
      throw new Error(`角色数据校验失败: ${details || error.message || "未知字段错误"}`)
    }

    throw new Error(error?.message || `ZOOT 投递失败 (HTTP ${response.status})`)
  }

  return result as ZootSendResult
}
