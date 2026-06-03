import { describe, expect, it } from "vitest"

import { CardType, createEmptyCard, type StandardCard } from "@/card/card-types"
import {
  buildSingleAncestrySelection,
  getDisplayedCharacterCards,
  inferMixedAncestryEnabled,
  getSingleAncestrySelectionCards,
} from "@/lib/ancestry-utils"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { migrateSheetData } from "@/lib/sheet-data-migration"

function createAncestryCard(id: string, race: string, name: string, level: number, description: string): StandardCard {
  return {
    standarized: true,
    id,
    name,
    type: CardType.Ancestry,
    class: race,
    level,
    description,
    hint: `${race}简介`,
    headerDisplay: name,
    cardSelectDisplay: {
      item1: race,
    },
  }
}

describe("ancestry utils", () => {
  it("auto-fills and orders single ancestry pairs", () => {
    const elfTrait2 = createAncestryCard("elf-2", "精灵", "月影步", 2, "第二项特性")
    const elfTrait1 = createAncestryCard("elf-1", "精灵", "夜视", 1, "第一项特性")

    const result = buildSingleAncestrySelection(elfTrait2, [elfTrait2, elfTrait1])

    expect(result.ancestry1).toBe("elf-1")
    expect(result.ancestry2).toBe("elf-2")
    expect(result.ancestry1Ref?.name).toBe("夜视")
    expect(result.ancestry2Ref?.name).toBe("月影步")
  })

  it("merges ancestry display into the first special slot when mixed ancestry is disabled", () => {
    const ancestry1 = createAncestryCard("elf-1", "精灵", "夜视", 1, "看清黑暗")
    const ancestry2 = createAncestryCard("elf-2", "精灵", "月影步", 2, "穿行林间")

    const cards = [...defaultSheetData.cards]
    cards[2] = ancestry1
    cards[3] = ancestry2

    const displayed = getDisplayedCharacterCards({
      ...defaultSheetData,
      mixedAncestryEnabled: false,
      cards,
    })

    expect(displayed[2].id).toBe("elf-1")
    expect(displayed[2].description).toContain("**夜视**")
    expect(displayed[2].description).toContain("**月影步**")
    expect(displayed[3].name).toBe("")
  })

  it("builds one merged ancestry selection card per race for single ancestry mode", () => {
    const cards = getSingleAncestrySelectionCards([
      createAncestryCard("elf-2", "精灵", "月影步", 2, "第二项特性"),
      createAncestryCard("elf-1", "精灵", "夜视", 1, "第一项特性"),
      createAncestryCard("human-1", "人类", "坚韧", 1, "适应万物"),
    ])

    expect(cards).toHaveLength(2)

    const elfCard = cards.find((card) => card.id === "elf-1")
    expect(elfCard?.name).toBe("精灵")
    expect(elfCard?.description).toContain("**夜视**")
    expect(elfCard?.description).toContain("**月影步**")
  })

  it("keeps ancestry cards separate when mixed ancestry is enabled", () => {
    const ancestry1 = createAncestryCard("elf-1", "精灵", "夜视", 1, "看清黑暗")
    const ancestry2 = createAncestryCard("human-1", "人类", "坚韧", 1, "适应万物")

    const cards = [...defaultSheetData.cards]
    cards[2] = ancestry1
    cards[3] = ancestry2

    const displayed = getDisplayedCharacterCards({
      ...defaultSheetData,
      mixedAncestryEnabled: true,
      cards,
    })

    expect(displayed[2].id).toBe("elf-1")
    expect(displayed[3].id).toBe("human-1")
  })

  it("infers mixed ancestry from legacy cards with different races", () => {
    const cards = [...defaultSheetData.cards]
    cards[2] = createAncestryCard("elf-1", "精灵", "夜视", 1, "看清黑暗")
    cards[3] = createAncestryCard("human-1", "人类", "坚韧", 1, "适应万物")

    expect(inferMixedAncestryEnabled({ cards })).toBe(true)
    expect(inferMixedAncestryEnabled({ ...defaultSheetData, cards, mixedAncestryEnabled: true })).toBe(true)
  })

  it("migrates legacy sheet data and infers mixedAncestryEnabled", () => {
    const cards = Array(20)
      .fill(null)
      .map(() => createEmptyCard())

    cards[2] = createAncestryCard("elf-1", "精灵", "夜视", 1, "看清黑暗")
    cards[3] = createAncestryCard("human-1", "人类", "坚韧", 1, "适应万物")

    const migrated = migrateSheetData({
      ...defaultSheetData,
      mixedAncestryEnabled: undefined,
      cards,
    })

    expect(migrated.mixedAncestryEnabled).toBe(true)
  })
})
