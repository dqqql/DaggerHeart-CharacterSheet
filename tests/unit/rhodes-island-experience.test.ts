import { describe, expect, it } from "vitest"

import { rhodesIslandCatalog } from "@/data/rhodes-island"
import { withRhodesIslandDefaultAncestryExperience } from "@/lib/rhodes-island-experience"
import type { SheetData } from "@/lib/sheet-data"

function makeSheet(overrides: Partial<SheetData> = {}): SheetData {
  return {
    ruleSetId: "rhodes-island",
    ancestry1Ref: { id: rhodesIslandCatalog.ancestries[0].id, name: rhodesIslandCatalog.ancestries[0].name },
    ancestryExperience: [""],
    ancestryExperienceValues: [""],
    ...overrides,
  } as SheetData
}

describe("Rhodes Island ancestry experience export defaults", () => {
  it("exports the first recommendation when the field is blank", () => {
    const source = makeSheet()
    const result = withRhodesIslandDefaultAncestryExperience(source)
    const firstRecommendation = rhodesIslandCatalog.ancestries[0].recommendedExperiences[0]

    expect(result.ancestryExperience).toEqual([firstRecommendation.name])
    expect(result.ancestryExperienceValues).toEqual([String(firstRecommendation.value)])
    expect(source.ancestryExperience).toEqual([""])
  })

  it("preserves player input and does not affect other rulesets", () => {
    const filled = makeSheet({ ancestryExperience: ["自定义经历"], ancestryExperienceValues: ["3"] })
    expect(withRhodesIslandDefaultAncestryExperience(filled)).toBe(filled)

    const standard = makeSheet({ ruleSetId: "daggerheart" })
    expect(withRhodesIslandDefaultAncestryExperience(standard)).toBe(standard)
  })
})
