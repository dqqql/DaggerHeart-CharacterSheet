import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  addCharacterToMetadataList,
  createNewCharacter,
  getActiveCharacterId,
  getActiveCharacterRecord,
  getCharactersForRuleSet,
  loadCharacterById,
  loadCharacterList,
  saveCharacterById,
  safeCleanupForTesting,
  setActiveCharacterId,
  switchToRuleSet,
} from "@/lib/multi-character-storage"
import { migrateSheetData } from "@/lib/sheet-data-migration"

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

  it("does not rewrite persisted data after migration has already stabilized", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T08:00:00.000Z"))

    const metadata = addCharacterToMetadataList("读取测试存档")
    expect(metadata).not.toBeNull()

    saveCharacterById(metadata!.id, {
      ...defaultSheetData,
      name: "当前格式角色",
    })

    vi.setSystemTime(new Date("2026-06-01T08:30:00.000Z"))
    loadCharacterById(metadata!.id)

    vi.setSystemTime(new Date("2026-06-01T09:30:00.000Z"))

    const loaded = loadCharacterById(metadata!.id)
    const savedMetadata = loadCharacterList().characters.find(
      (character) => character.id === metadata!.id,
    )

    expect(loaded?.name).toBe("当前格式角色")
    expect(savedMetadata?.lastModified).toBe("2026-06-01T08:30:00.000Z")
  })

  it("migrates historical metadata and payloads to daggerheart", () => {
    localStorage.setItem("dh_character_list", JSON.stringify({
      characters: [{
        id: "legacy-1",
        saveName: "旧存档",
        lastModified: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        order: 0,
      }],
      activeCharacterId: "legacy-1",
      lastUpdated: "2026-01-01T00:00:00.000Z",
    }))
    localStorage.setItem("dh_character_legacy-1", JSON.stringify({
      ...defaultSheetData,
      ruleSetId: undefined,
      name: "旧角色",
    }))

    expect(loadCharacterList().characters[0].ruleSetId).toBe("daggerheart")
    expect(loadCharacterById("legacy-1")?.ruleSetId).toBe("daggerheart")
  })

  it("keeps a ten-save limit independently for each ruleset", () => {
    for (let index = 0; index < 10; index += 1) {
      expect(addCharacterToMetadataList(`D${index}`, "daggerheart")).not.toBeNull()
      expect(addCharacterToMetadataList(`R${index}`, "rhodes-island")).not.toBeNull()
    }

    expect(addCharacterToMetadataList("D10", "daggerheart")).toBeNull()
    expect(addCharacterToMetadataList("R10", "rhodes-island")).toBeNull()
    expect(getCharactersForRuleSet("daggerheart")).toHaveLength(10)
    expect(getCharactersForRuleSet("rhodes-island")).toHaveLength(10)
  })

  it("remembers an active save per ruleset", () => {
    const daggerheart = addCharacterToMetadataList("D", "daggerheart")!
    const rhodes = addCharacterToMetadataList("R", "rhodes-island")!

    setActiveCharacterId(daggerheart.id, "daggerheart")
    setActiveCharacterId(rhodes.id, "rhodes-island")

    expect(getActiveCharacterId("daggerheart")).toBe(daggerheart.id)
    expect(getActiveCharacterId("rhodes-island")).toBe(rhodes.id)
    expect(getActiveCharacterRecord()).toEqual({
      ruleSetId: "rhodes-island",
      characterId: rhodes.id,
    })
  })

  it("creates a blank target save on first ruleset switch and restores it later", () => {
    const first = switchToRuleSet("rhodes-island")
    expect(first.created).toBe(true)
    expect(first.characterData.ruleSetId).toBe("rhodes-island")

    switchToRuleSet("daggerheart")
    const restored = switchToRuleSet("rhodes-island")
    expect(restored.created).toBe(false)
    expect(restored.characterId).toBe(first.characterId)
  })

  it("uses the target ruleset's most recently modified save when no active id exists", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T08:00:00.000Z"))
    const older = addCharacterToMetadataList("较旧", "rhodes-island")!
    saveCharacterById(older.id, createNewCharacter("旧角色", "rhodes-island"))

    vi.setSystemTime(new Date("2026-06-01T09:00:00.000Z"))
    const newer = addCharacterToMetadataList("较新", "rhodes-island")!
    saveCharacterById(newer.id, createNewCharacter("新角色", "rhodes-island"))

    const result = switchToRuleSet("rhodes-island")
    expect(result.created).toBe(false)
    expect(result.characterId).toBe(newer.id)
  })

  it("normalizes new ruleset-only fields without sharing automation state", () => {
    const migrated = migrateSheetData({
      ...createNewCharacter("测试", "rhodes-island"),
      ancestryExperience: ["敏锐观察"],
      ancestryExperienceValues: ["+2"],
      branchUpgradeCount: 99,
      selectedModule: "y",
      rulesetAutomationVersions: { "rhodes-island": 3 },
    })

    expect(migrated.ruleSetId).toBe("rhodes-island")
    expect(migrated.ancestryExperience).toEqual(["敏锐观察"])
    expect(migrated.branchUpgradeCount).toBe(2)
    expect(migrated.selectedModule).toBe("y")
    expect(migrated.rulesetAutomationVersions).toEqual({
      daggerheart: 0,
      "rhodes-island": 3,
    })
  })
})
