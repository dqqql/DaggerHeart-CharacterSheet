import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { defaultSheetData } from "@/lib/default-sheet-data"
import { useCharacterManagement } from "@/hooks/use-character-management"

const { saveCharacterByIdMock } = vi.hoisted(() => ({
  saveCharacterByIdMock: vi.fn(),
}))

vi.mock("@/lib/sheet-store", () => ({
  useSheetStore: () => ({
    replaceSheetData: vi.fn(),
  }),
}))

vi.mock("@/lib/multi-character-storage", () => ({
  migrateToMultiCharacterStorage: vi.fn(),
  loadCharacterList: vi.fn(() => ({
    characters: [],
    activeCharacterId: null,
    lastUpdated: "",
  })),
  loadCharacterById: vi.fn(),
  saveCharacterById: (...args: unknown[]) => saveCharacterByIdMock(...args),
  setActiveCharacterId: vi.fn(),
  getActiveCharacterId: vi.fn(),
  createNewCharacter: vi.fn(),
  addCharacterToMetadataList: vi.fn(),
  removeCharacterFromMetadataList: vi.fn(),
  updateCharacterInMetadataList: vi.fn(),
  MAX_CHARACTERS: 10,
  cleanupOrphanedCharacterData: vi.fn(() => 0),
  recoverCharacterListFromDataKeys: vi.fn(),
}))

describe("useCharacterManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    saveCharacterByIdMock.mockReturnValue("2026-06-01T10:11:12.000Z")
  })

  it("persists through the shared storage entry without re-rendering the hook", () => {
    let renderCount = 0

    const { result } = renderHook(() => {
      renderCount += 1

      return useCharacterManagement({
        isClient: false,
        setCurrentTabValue: vi.fn(),
      })
    })

    expect(renderCount).toBe(1)

    let lastModified = ""
    act(() => {
      lastModified = result.current.persistCharacterData("character-1", defaultSheetData)
    })

    expect(lastModified).toBe("2026-06-01T10:11:12.000Z")
    expect(saveCharacterByIdMock).toHaveBeenCalledWith("character-1", defaultSheetData)
    expect(renderCount).toBe(1)
  })
})
