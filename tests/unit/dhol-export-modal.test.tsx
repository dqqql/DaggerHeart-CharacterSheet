import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DholExportModal } from '@/components/modals/dhol-export-modal'
import { BottomDock } from '@/components/layout/bottom-dock'
import { createDefaultSheetData } from '@/lib/default-sheet-data'
import { rhodesIslandCatalog } from '@/data/rhodes-island'
import type { SheetData } from '@/lib/sheet-data'
import * as dholClient from '@/lib/dhol-client'

describe('DholExportModal', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('shows the room code, character name, and permanent overwrite explanation', () => {
    render(<DholExportModal isOpen onClose={() => {}} sheetData={{ ...createDefaultSheetData('daggerheart'), name: '阿岚' }} />)
    expect(screen.getByText('发送到桌面房间')).toBeInTheDocument()
    expect(screen.getByText('阿岚')).toBeInTheDocument()
    expect(screen.getByText(/全部数据和资源.*覆盖/)).toBeInTheDocument()
    expect(screen.getByLabelText('房间码')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '发送' })).toBeDisabled()
    const disclosure = screen.getByRole('button', { name: '自定义服务器地址' })
    expect(disclosure).toHaveAttribute('aria-expanded', 'false')
    expect(disclosure).toHaveAttribute('aria-controls', 'dhol-server-settings')
  })

  it('exposes the expanded server settings panel to assistive technology', async () => {
    const user = userEvent.setup()
    render(<DholExportModal isOpen onClose={() => {}} sheetData={{ ...createDefaultSheetData('daggerheart'), name: '阿岚' }} />)
    const disclosure = screen.getByRole('button', { name: '自定义服务器地址' })
    await user.click(disclosure)
    expect(screen.getByRole('button', { name: '收起服务器设置' })).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById('dhol-server-settings')).toBeInTheDocument()
  })

  it('treats malformed 2xx data as failure without saving or rotating the retry ID', async () => {
    const user = userEvent.setup()
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn()
      .mockResolvedValue(Response.json({ ok: true, action: 'created' }))
    try {
      render(<DholExportModal isOpen onClose={() => {}} sheetData={{ ...createDefaultSheetData('daggerheart'), name: '阿岚' }} />)
      await user.type(screen.getByLabelText('房间码'), 'ABC123')
      await user.click(screen.getByRole('button', { name: '发送' }))
      expect(await screen.findByText(/响应异常/)).toBeInTheDocument()
      expect(localStorage.getItem('dhol_last_room_code')).toBeNull()
      await user.click(screen.getByRole('button', { name: '发送' }))
      await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2))
      const firstHeaders = vi.mocked(globalThis.fetch).mock.calls[0][1]?.headers as Record<string, string>
      const retryHeaders = vi.mocked(globalThis.fetch).mock.calls[1][1]?.headers as Record<string, string>
      expect(retryHeaders['Idempotency-Key']).toBe(firstHeaders['Idempotency-Key'])
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it.each(['daggerheart', 'rhodes-island'] as const)('opens from the %s export menu without replacing other destinations', async ruleSetId => {
    const user = userEvent.setup()
    const openDhol = vi.fn()
    render(
      <BottomDock
        mode="main"
        ruleSetId={ruleSetId}
        isMobile={false}
        isCardDrawerOpen={false}
        characterCount={1}
        onToggleCardDrawer={() => {}}
        onToggleGuide={() => {}}
        onToggleNotebook={() => {}}
        onPrintAll={() => {}}
        onOpenSealDiceExport={() => {}}
        onOpenCharacterCodeExport={() => {}}
        onOpenDholExport={openDhol}
        onQuickExportJSON={() => {}}
        onQuickExportPDF={() => {}}
        onQuickExportHTML={() => {}}
        onOpenCharacterManagement={() => {}}
        onQuickCreateArchive={() => {}}
        onQuickImportFromJSON={() => {}}
        onQuickImportFromHTML={() => {}}
      />,
    )
    await user.click(screen.getByTestId('export-menu-trigger'))
    await user.click(await screen.findByTestId('export-dhol-item'))
    expect(openDhol).toHaveBeenCalledTimes(1)
  })

  it('keeps the same idempotency ID and form after a network failure, then rotates it after success', async () => {
    const user = userEvent.setup()
    const send = vi.spyOn(dholClient, 'sendCharacterToDhol')
      .mockRejectedValueOnce(new Error('无法连接到桌面房间'))
      .mockResolvedValueOnce({ ok: true, action: 'updated', name: '阿岚', generation: 8, seq: 8 })
      .mockResolvedValueOnce({ ok: true, action: 'updated', name: '阿岚', generation: 9, seq: 9 })

    render(<DholExportModal isOpen onClose={() => {}} sheetData={{ ...createDefaultSheetData('daggerheart'), name: '阿岚' }} />)
    await user.type(screen.getByLabelText('房间码'), 'abc123')
    await user.click(screen.getByRole('button', { name: '发送' }))
    expect(await screen.findByText('无法连接到桌面房间')).toBeInTheDocument()
    expect(screen.getByLabelText('房间码')).toHaveValue('ABC123')
    expect(localStorage.getItem('dhol_last_room_code')).toBeNull()
    expect(localStorage.getItem('dhol_server_url')).toBeNull()

    await user.click(screen.getByRole('button', { name: '发送' }))
    expect(await screen.findByText('已覆盖：阿岚')).toBeInTheDocument()
    expect(localStorage.getItem('dhol_last_room_code')).toBe('ABC123')
    expect(localStorage.getItem('dhol_server_url')).toBe(dholClient.DEFAULT_DHOL_BASE_URL)
    expect(send.mock.calls[1][0].idempotencyKey).toBe(send.mock.calls[0][0].idempotencyKey)

    await user.click(screen.getByRole('button', { name: '发送' }))
    await waitFor(() => expect(send).toHaveBeenCalledTimes(3))
    expect(send.mock.calls[2][0].idempotencyKey).not.toBe(send.mock.calls[1][0].idempotencyKey)
  })

  it('disables duplicate clicks during an in-flight send', async () => {
    const user = userEvent.setup()
    let finish!: (value: dholClient.DholSendResult) => void
    const pending = new Promise<dholClient.DholSendResult>(resolve => { finish = resolve })
    const send = vi.spyOn(dholClient, 'sendCharacterToDhol').mockReturnValueOnce(pending)
    render(<DholExportModal isOpen onClose={() => {}} sheetData={{ ...createDefaultSheetData('daggerheart'), name: '阿岚' }} />)
    await user.type(screen.getByLabelText('房间码'), 'ABC123')
    const button = screen.getByRole('button', { name: '发送' })
    await user.click(button)
    expect(screen.getByRole('button', { name: '发送中...' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '发送中...' }))
    expect(send).toHaveBeenCalledTimes(1)
    finish({ ok: true, action: 'created', name: '阿岚', generation: 1, seq: 1 })
    expect(await screen.findByText('已新增：阿岚')).toBeInTheDocument()
  })

  it.each(['daggerheart', 'rhodes-island'] as const)('prepares the %s sheet, including a custom card, before sending', async ruleSetId => {
    const user = userEvent.setup()
    const send = vi.spyOn(dholClient, 'sendCharacterToDhol').mockResolvedValueOnce({ ok: true, action: 'created', name: '角色', generation: 1, seq: 1 })
    const sheet = {
      ...createDefaultSheetData(ruleSetId),
      name: '角色',
      cards: [{ id: 'custom', name: '自定义领域卡', description: '只读结果应保留' }] as unknown as SheetData['cards'],
      ...(ruleSetId === 'rhodes-island' ? {
        ancestry1Ref: { id: rhodesIslandCatalog.ancestries[0].id, name: rhodesIslandCatalog.ancestries[0].name },
        ancestryExperience: [''],
        ancestryExperienceValues: [''],
      } : {}),
    }
    render(<DholExportModal isOpen onClose={() => {}} sheetData={sheet} />)
    await user.type(screen.getByLabelText('房间码'), 'ABC123')
    await user.click(screen.getByRole('button', { name: '发送' }))
    await waitFor(() => expect(send).toHaveBeenCalled())
    expect(send.mock.calls[0][0].sheetData.cards).toEqual(sheet.cards)
    expect(send.mock.calls[0][0].sheetData.ruleSetId).toBe(ruleSetId)
    if (ruleSetId === 'rhodes-island') {
      const recommendation = rhodesIslandCatalog.ancestries[0].recommendedExperiences[0]
      expect(send.mock.calls[0][0].sheetData.ancestryExperience).toEqual([recommendation.name])
      expect(send.mock.calls[0][0].sheetData.ancestryExperienceValues).toEqual([String(recommendation.value)])
    }
  })
})
