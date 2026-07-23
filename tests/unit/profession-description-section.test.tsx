import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import ProfessionDescriptionSection from "@/components/character-sheet-sections/profession-description-section"

describe("ProfessionDescriptionSection", () => {
  it("places a flowing subclass divider immediately before subclass features", () => {
    render(
      <ProfessionDescriptionSection
        description={"一鼓作气：职业特性内容。\n\n冲锋陷阵+：子职特性内容。"}
        subclassDescription="冲锋陷阵+：子职特性内容。"
      />,
    )

    const professionFeature = screen.getByText("一鼓作气：职业特性内容。")
    const divider = screen.getByText("以下为子职特性").closest("[data-subclass-feature-divider]")
    const subclassFeature = screen.getByText("冲锋陷阵+：子职特性内容。")

    expect(divider).not.toBeNull()
    expect(divider).toHaveClass("text-cyan-700")
    expect(professionFeature.compareDocumentPosition(divider!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(divider!.compareDocumentPosition(subclassFeature)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })
})
