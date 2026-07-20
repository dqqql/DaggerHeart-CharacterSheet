import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { rhodesIslandCatalog } from "@/data/rhodes-island"
import { ExperienceSection } from "@/components/character-sheet-sections/experience-section"

const setSheetData = vi.fn()

vi.mock("@/lib/sheet-store", () => ({
  useSheetStore: () => ({
    sheetData: {
      ruleSetId: "rhodes-island",
      ancestry1Ref: {
        id: rhodesIslandCatalog.ancestries[0].id,
        name: rhodesIslandCatalog.ancestries[0].name,
      },
      ancestryExperience: [""],
      ancestryExperienceValues: ["2"],
      experience: ["", "", "", "", ""],
      experienceValues: ["", "", "", "", ""],
      cards: [],
    },
    setSheetData,
    updateExperience: vi.fn(),
    updateExperienceValues: vi.fn(),
  }),
}))

describe("Rhodes Island ancestry experience field", () => {
  beforeEach(() => setSheetData.mockClear())

  it("uses the first recommended experience as a gray input hint", () => {
    render(<ExperienceSection />)
    const input = screen.getByLabelText("种族经历")
    const recommendation = rhodesIslandCatalog.ancestries[0].recommendedExperiences[0]
    const placeholder = `推荐：${rhodesIslandCatalog.ancestries[0].recommendedExperiences
      .map((item) => `${item.name} +${item.value}`)
      .join(" / ")}`

    expect(input).toHaveAttribute("placeholder", placeholder)
    expect(input).toHaveAttribute("data-export-default-value", recommendation.name)
    expect(screen.getByLabelText("种族经历加值")).toHaveAttribute(
      "data-export-default-value",
      String(recommendation.value),
    )
    expect(screen.queryByLabelText("查看推荐经历")).not.toBeInTheDocument()

    fireEvent.change(input, { target: { value: "玩家自定义经历" } })
    expect(setSheetData).toHaveBeenCalledWith({ ancestryExperience: ["玩家自定义经历"] })
  })
})
