import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { CharacterManagementModal } from "@/components/modals/character-management-modal"

const { loadCharacterByIdMock, loadCharacterDisplayNameByIdMock } = vi.hoisted(() => ({
  loadCharacterByIdMock: vi.fn(),
  loadCharacterDisplayNameByIdMock: vi.fn(),
}))

vi.mock("@/lib/sheet-store", () => ({
  useSheetStore: () => ({
    sheetData: {},
    replaceSheetData: vi.fn(),
  }),
}))

vi.mock("@/lib/multi-character-storage", () => ({
  MAX_CHARACTERS: 10,
  loadCharacterById: (...args: unknown[]) => loadCharacterByIdMock(...args),
  loadCharacterDisplayNameById: (...args: unknown[]) =>
    loadCharacterDisplayNameByIdMock(...args),
}))

describe("CharacterManagementModal", () => {
  it("loads display names without calling the full character loader during render", async () => {
    loadCharacterDisplayNameByIdMock.mockReturnValue("测试角色")

    render(
      <CharacterManagementModal
        isOpen
        onClose={vi.fn()}
        characterList={[
          {
            id: "character-1",
            saveName: "测试存档",
            createdAt: "2026-06-01T00:00:00.000Z",
            lastModified: "2026-06-01T00:00:00.000Z",
            order: 0,
          },
        ]}
        currentCharacterId="character-1"
        onSwitchCharacter={vi.fn()}
        onCreateCharacter={vi.fn()}
        onDeleteCharacter={vi.fn()}
        onDuplicateCharacter={vi.fn()}
        onRenameCharacter={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(loadCharacterDisplayNameByIdMock).toHaveBeenCalledWith("character-1")
    })

    expect(loadCharacterByIdMock).not.toHaveBeenCalled()
    expect(screen.getByText(/角色: 测试角色/)).toBeInTheDocument()
  })
})
