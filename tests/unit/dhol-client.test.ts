import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultSheetData } from '@/lib/default-sheet-data'
import type { SheetData } from '@/lib/sheet-data'
import {
  normalizeDholRoomCode,
  sendCharacterToDhol,
} from '@/lib/dhol-client'
import { buildDholDesktopView } from '@/lib/dhol-desktop-view'

describe('dhol-client', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('normalizes the independent six-character room code', () => {
    expect(normalizeDholRoomCode(' ab-c 12! ')).toBe('ABC12')
  })

  it.each(['daggerheart', 'rhodes-island'] as const)('sends the full %s export to only the Room V2 endpoint', async ruleSetId => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(Response.json({
      ok: true,
      action: 'created',
      name: '测试角色',
      generation: 4,
      seq: 4,
    }))
    const sheet = {
      ...createDefaultSheetData(ruleSetId),
      name: '测试角色',
      cards: [{ id: 'custom-domain', name: '自定义领域卡', description: '完整正文' }] as unknown as SheetData['cards'],
    }

    const result = await sendCharacterToDhol({
      baseUrl: 'https://dhol.example/',
      roomCode: 'abc123',
      idempotencyKey: 'send-1',
      sheetData: sheet,
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://dhol.example/api/v2/rooms/ABC123/characters',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'send-1',
        },
        body: JSON.stringify({ schemaVersion: 2, sheet: { ...sheet, desktopView: buildDholDesktopView(sheet) } }),
      }),
    )
    expect(result).toEqual({ ok: true, action: 'created', name: '测试角色', generation: 4, seq: 4 })
  })

  it('sends edited text and the currently displayed manual threshold value', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(Response.json({ ok: true, action: 'updated', name: '阿岚', generation: 5, seq: 5 }))
    const sheet = {
      ...createDefaultSheetData('daggerheart'), name: '阿岚', minorThresholdManualModifier: '5',
      characterBackground: '发送前刚改的背景', hpMax: 7, stressMax: 7,
    }
    await sendCharacterToDhol({ roomCode: 'ABC123', idempotencyKey: 'changed-1', sheetData: sheet })
    const body = JSON.parse(String(vi.mocked(globalThis.fetch).mock.calls[0][1]?.body))
    expect(body.schemaVersion).toBe(2)
    expect(body.sheet.characterBackground).toBe('发送前刚改的背景')
    expect(body.sheet.desktopView.minorThreshold).toBe(buildDholDesktopView(sheet).minorThreshold)
    expect(body.sheet.desktopView.minorThreshold).not.toBe(sheet.minorThreshold)
    expect(body.sheet.desktopView.hpMax).toBe(7)
    expect(body.sheet.desktopView.stressMax).toBe(7)
  })

  it('rejects non-six-character codes before making a request', async () => {
    await expect(sendCharacterToDhol({
      roomCode: 'ABCDEFGH',
      idempotencyKey: 'send-1',
      sheetData: { ...createDefaultSheetData('daggerheart'), name: '阿岚' },
    })).rejects.toThrow('6 位')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it.each([
    { ok: true },
    { ok: true, action: 'replaced', name: '阿岚', generation: 1, seq: 1 },
    { ok: true, action: 'created', name: '', generation: 1, seq: 1 },
    { ok: true, action: 'created', name: '阿岚', generation: -1, seq: 1 },
    { ok: true, action: 'updated', name: '阿岚', generation: 1.5, seq: 1 },
    { ok: true, action: 'updated', name: '阿岚', generation: 1, seq: Number.POSITIVE_INFINITY },
  ])('rejects a malformed successful response %#', async payload => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(Response.json(payload))
    await expect(sendCharacterToDhol({
      roomCode: 'ABC123',
      idempotencyKey: 'send-1',
      sheetData: { ...createDefaultSheetData('daggerheart'), name: '阿岚' },
    })).rejects.toThrow('响应异常')
  })

  it.each([
    ['ROOM_NOT_FOUND', '房间不存在'],
    ['ROOM_EXPIRED', '房间已过期'],
    ['INVALID_CHARACTER', '角色数据无效'],
    ['UNSUPPORTED_SCHEMA', '版本'],
    ['PAYLOAD_TOO_LARGE', '过大'],
    ['RATE_LIMITED', '频繁'],
    ['PERSISTENCE_FAILED', '保存失败'],
  ])('maps %s to an actionable message', async (code, message) => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(Response.json({ code }, { status: 400 }))
    await expect(sendCharacterToDhol({
      roomCode: 'ABC123',
      idempotencyKey: 'send-1',
      sheetData: { ...createDefaultSheetData('daggerheart'), name: '阿岚' },
    })).rejects.toThrow(message)
  })

  it('reports a network failure without changing the caller-owned retry ID', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(sendCharacterToDhol({
      roomCode: 'ABC123',
      idempotencyKey: 'same-on-retry',
      sheetData: { ...createDefaultSheetData('daggerheart'), name: '阿岚' },
    })).rejects.toThrow('无法连接')
    expect(vi.mocked(globalThis.fetch).mock.calls[0][1]).toMatchObject({
      headers: expect.objectContaining({ 'Idempotency-Key': 'same-on-retry' }),
    })
  })
})
