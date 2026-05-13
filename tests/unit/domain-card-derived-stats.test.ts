import { describe, expect, it } from "vitest"

import { createEmptyCard } from "@/card/card-types"
import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  calculateDamageThresholdBreakdown,
  calculateEvasionBreakdown,
  convertDisplayedHpMaxToStoredBase,
  convertDisplayedStressMaxToStoredBase,
  getDisplayedHpMax,
  getDisplayedStressMax,
} from "@/lib/domain-card-derived-stats"

function createCard(id: string, type: "domain" | "ancestry" | "subclass") {
  const card = createEmptyCard(type)
  card.id = id
  card.name = id
  card.type = type
  return card
}

describe("domain and character card derived stats", () => {
  it("uses the correct tier thresholds for bare bones across level bands", () => {
    const cards = [createEmptyCard(), createEmptyCard(), createEmptyCard(), createEmptyCard(), createEmptyCard()]
    cards.push(createCard("bare-bones", "domain"))

    expect(calculateDamageThresholdBreakdown({ ...defaultSheetData, cards, level: "1" }).minor.display).toBe("10")
    expect(calculateDamageThresholdBreakdown({ ...defaultSheetData, cards, level: "1" }).major.display).toBe("20")

    expect(calculateDamageThresholdBreakdown({ ...defaultSheetData, cards, level: "2" }).minor.display).toBe("13")
    expect(calculateDamageThresholdBreakdown({ ...defaultSheetData, cards, level: "2" }).major.display).toBe("26")

    expect(calculateDamageThresholdBreakdown({ ...defaultSheetData, cards, level: "5" }).minor.display).toBe("18")
    expect(calculateDamageThresholdBreakdown({ ...defaultSheetData, cards, level: "5" }).major.display).toBe("36")

    expect(calculateDamageThresholdBreakdown({ ...defaultSheetData, cards, level: "8" }).minor.display).toBe("23")
    expect(calculateDamageThresholdBreakdown({ ...defaultSheetData, cards, level: "8" }).major.display).toBe("46")
  })

  it("applies ancestry and subclass threshold bonuses automatically", () => {
    const cards = [
      createEmptyCard(),
      createCard("Stalwart-Foundation", "subclass"),
      createCard("Galapa-Shell", "ancestry"),
      createEmptyCard(),
      createEmptyCard(),
    ]

    const result = calculateDamageThresholdBreakdown({
      ...defaultSheetData,
      cards,
      level: "1",
      armorThreshold: "10/20",
      proficiency: [true, true, false, false, false, false],
    })

    expect(result.minor.display).toBe("14")
    expect(result.major.display).toBe("24")
  })

  it("shows hp max bonuses without double-counting the stored base", () => {
    const cards = [
      createEmptyCard(),
      createCard("School-of-War-Foundation", "subclass"),
      createCard("Giant-Endurance", "ancestry"),
      createEmptyCard(),
      createEmptyCard(),
    ]

    const data = {
      ...defaultSheetData,
      cards,
      hpMax: 6,
    }

    expect(getDisplayedHpMax(data)).toBe(8)
    expect(convertDisplayedHpMaxToStoredBase(data, 8)).toBe(6)
    expect(convertDisplayedHpMaxToStoredBase(data, 9)).toBe(7)
  })

  it("shows stress max bonuses without double-counting the stored base", () => {
    const cards = [
      createEmptyCard(),
      createCard("Vengeance-Foundation", "subclass"),
      createCard("Human-HighStamina", "ancestry"),
      createEmptyCard(),
      createEmptyCard(),
    ]

    const data = {
      ...defaultSheetData,
      cards,
      stressMax: 6,
    }

    expect(getDisplayedStressMax(data)).toBe(8)
    expect(convertDisplayedStressMaxToStoredBase(data, 8)).toBe(6)
    expect(convertDisplayedStressMaxToStoredBase(data, 9)).toBe(7)
  })

  it("applies permanent ancestry and subclass evasion bonuses automatically", () => {
    const cards = [
      createEmptyCard(),
      createCard("Nightwalker-Mastery", "subclass"),
      createCard("Simiah-Nimble", "ancestry"),
      createEmptyCard(),
      createEmptyCard(),
    ]

    const result = calculateEvasionBreakdown({
      ...defaultSheetData,
      cards,
      evasionManualModifier: "",
    })

    expect(result.display).toBe("2")
  })
})
