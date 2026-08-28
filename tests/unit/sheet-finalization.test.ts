import { afterEach, describe, expect, it, vi } from "vitest"

import { createEmptyCard, type StandardCard } from "@/card/card-types"
import { rhodesIslandCards, rhodesIslandCatalog } from "@/data/rhodes-island"
import { createDefaultSheetData } from "@/lib/default-sheet-data"
import { daggerheartRuleSet } from "@/lib/rulesets/daggerheart/definition"
import { rhodesIslandRuleSet } from "@/lib/rulesets/rhodes-island/definition"
import {
  finalizeSheetData,
  getExplicitlyClearedDerivedFields,
} from "@/lib/sheet-finalization"

function createCard(id: string, type: "domain" | "profession" | "subclass") {
  const card = createEmptyCard(type)
  card.id = id
  card.name = id
  return card
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("sheet finalization", () => {
  it("syncs SRD subclass spellcasting and preserves domain-derived stats", () => {
    const oldData = createDefaultSheetData("daggerheart")
    const cards = [...oldData.cards]
    const subclass = createCard("test-subclass", "subclass")
    subclass.cardSelectDisplay.item3 = "知识"
    cards[1] = subclass
    cards[5] = createCard("bare-bones", "domain")

    const result = finalizeSheetData(
      {
        ...oldData,
        level: "3",
        armorThreshold: "6/12",
        cards,
      },
      oldData,
    )

    expect(result.knowledge?.spellcasting).toBe(true)
    expect(result.minorThreshold).toBe("14")
    expect(result.majorThreshold).toBe("27")
  })

  it("applies Rhodes Island automation before its derived sources", () => {
    const oldData = createDefaultSheetData("rhodes-island")
    const branch = rhodesIslandCatalog.branches.find(
      item => item.id === "ri-branch-97014a65f041",
    )!
    const professionCard = rhodesIslandCards.find(
      card => card.id === branch.professionId,
    ) as StandardCard
    const branchCard = rhodesIslandCards.find(card => card.id === branch.id) as StandardCard
    const cards = [...oldData.cards]
    cards[0] = professionCard
    cards[1] = branchCard

    const result = finalizeSheetData(
      {
        ...oldData,
        armorThreshold: "6/12",
        professionRef: { id: professionCard.id, name: professionCard.name },
        subclassRef: { id: branchCard.id, name: branchCard.name },
        cards,
      },
      oldData,
    )

    expect(result.primaryWeaponName).toBe(branch.stages[0].weapon.name)
    expect(result.armorValue).toBe("1")
    expect(result.minorThreshold).toBe("8")
    expect(result.majorThreshold).toBe("13")
  })

  it("routes SRD normalization without invoking the Rhodes Island module", () => {
    const daggerheartNormalize = vi.spyOn(daggerheartRuleSet, "normalizeSheetData")
    const rhodesNormalize = vi.spyOn(rhodesIslandRuleSet, "normalizeSheetData")
    const data = createDefaultSheetData("daggerheart")

    finalizeSheetData(data, data)

    expect(daggerheartNormalize).toHaveBeenCalledOnce()
    expect(rhodesNormalize).not.toHaveBeenCalled()
  })

  it("preserves explicit clearing of evasion and thresholds", () => {
    const oldData = createDefaultSheetData("daggerheart")
    const cards = [...oldData.cards]
    const profession = createCard("test-profession", "profession")
    profession.professionSpecial = {
      起始生命: 6,
      起始闪避: 10,
      起始物品: "",
      希望特性: "",
    }
    cards[0] = profession
    const updates = {
      evasion: "",
      evasionManualModifier: "",
      minorThreshold: "",
      minorThresholdManualModifier: "",
      majorThreshold: "",
      majorThresholdManualModifier: "",
    }

    const result = finalizeSheetData(
      { ...oldData, ...updates, armorThreshold: "6/12", cards },
      oldData,
      getExplicitlyClearedDerivedFields(updates),
    )

    expect(result.evasion).toBe("")
    expect(result.minorThreshold).toBe("")
    expect(result.majorThreshold).toBe("")
  })
})
