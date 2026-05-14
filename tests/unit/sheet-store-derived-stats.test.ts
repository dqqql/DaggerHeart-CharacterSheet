import { beforeEach, describe, expect, it } from "vitest"

import { createEmptyCard } from "@/card/card-types"
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
})
