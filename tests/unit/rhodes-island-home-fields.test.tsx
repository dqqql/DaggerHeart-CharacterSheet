import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SheetData } from "@/lib/sheet-data"
import type { StandardCard } from "@/card/card-types"
import { createEmptyCard } from "@/card/card-types"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { rhodesIslandCards, rhodesIslandCatalog } from "@/data/rhodes-island"
import { applyRhodesIslandAutomation } from "@/lib/rhodes-island-automation"
import { WeaponSection } from "@/components/character-sheet-sections/weapon-section"
import { HopeSection } from "@/components/character-sheet-sections/hope-section"

let sheetData: SheetData
const setSheetData = vi.fn()

vi.mock("@/lib/sheet-store", () => ({
  useSheetStore: () => ({
    sheetData,
    setSheetData,
    updateHope: vi.fn(),
  }),
}))

function createXModuleSheet(): SheetData {
  const branch = rhodesIslandCatalog.branches[0]
  const professionCard = rhodesIslandCards.find(card => card.id === branch.professionId) as StandardCard
  const branchCard = rhodesIslandCards.find(card => card.id === branch.id) as StandardCard
  const cards = Array.from({ length: 20 }, () => createEmptyCard())
  cards[0] = professionCard
  cards[1] = branchCard

  return applyRhodesIslandAutomation({
    ...defaultSheetData,
    ruleSetId: "rhodes-island",
    level: "8",
    professionRef: { id: professionCard.id, name: professionCard.name },
    subclassRef: { id: branchCard.id, name: branchCard.name },
    selectedModule: "x",
    cards,
  })
}

describe("Rhodes Island home fields", () => {
  beforeEach(() => {
    setSheetData.mockClear()
    sheetData = createXModuleSheet()
  })

  it("keeps the bound primary weapon prototype editable with the requested placeholder", () => {
    render(
      <WeaponSection
        isPrimary
        fieldPrefix="primaryWeapon"
        onOpenWeaponModal={vi.fn()}
      />,
    )

    const field = screen.getByPlaceholderText("和游戏主持人共同商讨，并在此处填写武器原型的形制")
    expect(field).not.toHaveAttribute("readonly")
    expect(field).not.toBeDisabled()
  })

  it("shows X-module additions and changes in green on the hope feature", () => {
    const { container } = render(<HopeSection />)
    const highlightedFeature = screen.getByLabelText("X 模组修改后的希望特性；绿色文字为新增或修改内容")
    const changedText = Array.from(container.querySelectorAll("mark"))
      .map(element => element.textContent)
      .join("")

    expect(highlightedFeature).toBeInTheDocument()
    expect(highlightedFeature).not.toHaveTextContent("冲锋手")
    expect(changedText).not.toBe("")
    expect(changedText).not.toContain("冲锋手")
    expect(container.querySelector("mark")).toHaveClass("text-emerald-600")
  })
})
