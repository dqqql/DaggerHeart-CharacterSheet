import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { ZootExportModal } from "@/components/modals/zoot-export-modal"
import * as zootClient from "@/lib/zoot-client"
import { createDefaultSheetData } from "@/lib/default-sheet-data"
import type { SheetData } from "@/lib/sheet-data"

function createSampleSheet(overrides?: Partial<SheetData>): SheetData {
  return {
    ...createDefaultSheetData("rhodes-island"),
    name: "德克萨斯",
    ...overrides,
  }
}

describe("ZootExportModal", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("renders modal with room code input, character name, and action buttons", () => {
    render(
      <ZootExportModal
        isOpen={true}
        onClose={() => {}}
        sheetData={createSampleSheet()}
      />,
    )

    expect(screen.getByText("发送角色到 ZOOT")).toBeInTheDocument()
    expect(screen.getByText("德克萨斯")).toBeInTheDocument()
    expect(screen.getByTestId("zoot-room-code-input")).toBeInTheDocument()
    expect(screen.getByTestId("zoot-cancel-button")).toBeInTheDocument()
    expect(screen.getByTestId("zoot-send-button")).toBeInTheDocument()
    // Send button disabled initially because room code is empty
    expect(screen.getByTestId("zoot-send-button")).toBeDisabled()
  })

  it("calls onClose when Cancel button is clicked", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <ZootExportModal
        isOpen={true}
        onClose={onClose}
        sheetData={createSampleSheet()}
      />,
    )

    await user.click(screen.getByTestId("zoot-cancel-button"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("formats room code as user types and enables Send button once 8 chars entered", async () => {
    const user = userEvent.setup()
    render(
      <ZootExportModal
        isOpen={true}
        onClose={() => {}}
        sheetData={createSampleSheet()}
      />,
    )

    const input = screen.getByTestId("zoot-room-code-input")
    await user.type(input, "abcdefgh")

    expect(input).toHaveValue("ABCD-EFGH")
    expect(screen.getByTestId("zoot-send-button")).not.toBeDisabled()
  })

  it("executes successful delivery and closes modal", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const sendSpy = vi
      .spyOn(zootClient, "sendCharacterToZoot")
      .mockResolvedValueOnce({
        ok: true,
        action: "created",
        characterName: "德克萨斯",
        receivedAt: "2026-09-09T01:30:00.000Z",
      })

    render(
      <ZootExportModal
        isOpen={true}
        onClose={onClose}
        sheetData={createSampleSheet()}
      />,
    )

    const input = screen.getByTestId("zoot-room-code-input")
    await user.type(input, "12345678")
    await user.click(screen.getByTestId("zoot-send-button"))

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          roomCode: "12345678",
          sheetData: expect.objectContaining({ name: "德克萨斯" }),
        }),
      )
    })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem("zoot_last_room_code")).toBe("12345678")
  })

  it("shows error banner when delivery fails", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    vi.spyOn(zootClient, "sendCharacterToZoot").mockRejectedValueOnce(
      new Error("房间不存在或已关闭，请检查房间码或联系主持人 (GM)"),
    )

    render(
      <ZootExportModal
        isOpen={true}
        onClose={onClose}
        sheetData={createSampleSheet()}
      />,
    )

    const input = screen.getByTestId("zoot-room-code-input")
    await user.type(input, "NONEXIST")
    await user.click(screen.getByTestId("zoot-send-button"))

    await waitFor(() => {
      expect(screen.getByTestId("zoot-export-error")).toBeInTheDocument()
    })

    expect(screen.getByText(/房间不存在或已关闭/)).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
