import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  addCharacterToMetadataList,
  loadCharacterList,
  saveCharacterById,
  safeCleanupForTesting,
} from "@/lib/multi-character-storage"

describe("multi-character storage", () => {
  beforeEach(() => {
    safeCleanupForTesting()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("updates persisted payload and lastModified through saveCharacterById", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-31T12:34:56.000Z"))

    const metadata = addCharacterToMetadataList("测试存档")
    expect(metadata).not.toBeNull()

    saveCharacterById(metadata!.id, {
      ...defaultSheetData,
      name: "已自动保存的角色",
    })

    const payload = localStorage.getItem(`dh_character_${metadata!.id}`)
    const list = loadCharacterList()
    const savedMetadata = list.characters.find((character) => character.id === metadata!.id)

    expect(payload).not.toBeNull()
    expect(payload).toContain('"name":"已自动保存的角色"')
    expect(savedMetadata?.lastModified).toBe("2026-05-31T12:34:56.000Z")
  })
})
