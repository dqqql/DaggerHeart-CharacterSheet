import { beforeEach, describe, expect, it } from "vitest"

import { createEmptyCard, type StandardCard } from "@/card/card-types"
import { rhodesIslandCards, rhodesIslandCatalog } from "@/data/rhodes-island"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { useSheetStore } from "@/lib/sheet-store"

function createCard(id: string, type: "domain" | "ancestry" | "subclass") {
  const card = createEmptyCard(type)
  card.id = id
  card.name = id
  card.type = type
  return card
}

describe("sheet store derived stat syncing", () => {
  beforeEach(() => {
    useSheetStore.setState({
      sheetData: {
        ...defaultSheetData,
        cards: Array(20).fill(0).map(() => createEmptyCard()),
        inventory_cards: Array(20).fill(0).map(() => createEmptyCard()),
      },
    })
  })

  it("recalculates thresholds after moving bare bones out of the focused deck", () => {
    const store = useSheetStore.getState()
    const cards = [...store.sheetData.cards]
    cards[5] = createCard("bare-bones", "domain")

    store.setSheetData({
      level: "3",
      armorThreshold: "6/12",
      cards,
    })

    let state = useSheetStore.getState().sheetData
    expect(state.minorThreshold).toBe("14")
    expect(state.majorThreshold).toBe("27")

    const moved = useSheetStore.getState().moveCard(5, false, true)
    expect(moved).toBe(true)

    state = useSheetStore.getState().sheetData
    expect(state.minorThreshold).toBe("9")
    expect(state.majorThreshold).toBe("15")
  })

  it("routes Rhodes Island updates through the shared finalization pipeline", () => {
    const branch = rhodesIslandCatalog.branches.find(
      item => item.id === "ri-branch-97014a65f041",
    )!
    const professionCard = rhodesIslandCards.find(
      card => card.id === branch.professionId,
    ) as StandardCard
    const branchCard = rhodesIslandCards.find(card => card.id === branch.id) as StandardCard
    const cards = [...useSheetStore.getState().sheetData.cards]
    cards[0] = professionCard
    cards[1] = branchCard

    useSheetStore.getState().setSheetData({
      ruleSetId: "rhodes-island",
      armorThreshold: "6/12",
      professionRef: { id: professionCard.id, name: professionCard.name },
      subclassRef: { id: branchCard.id, name: branchCard.name },
      cards,
    })

    const result = useSheetStore.getState().sheetData
    expect(result.primaryWeaponName).toBe(branch.stages[0].weapon.name)
    expect(result.armorValue).toBe("1")
    expect(result.minorThreshold).toBe("8")
    expect(result.majorThreshold).toBe("13")
  })
})
