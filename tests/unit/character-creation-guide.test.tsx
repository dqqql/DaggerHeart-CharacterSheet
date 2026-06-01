import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { CardType } from "@/card/card-types"
import { CharacterCreationGuide } from "@/components/guide/character-creation-guide"

vi.mock("@/lib/sheet-store", () => ({
  useSheetStore: () => ({
    sheetData: {
      profession: "profession-1",
      professionRef: { id: "profession-1" },
      cards: [
        {
          id: "profession-1",
          type: CardType.Profession,
          class: "战士",
          hint: '安全说明 **加粗** <img src="x" onerror="alert(1)"> [危险链接](javascript:alert(1))',
        },
      ],
    },
  }),
}))

describe("CharacterCreationGuide", () => {
  it("renders guide content through markdown instead of innerHTML", () => {
    const { container } = render(<CharacterCreationGuide isOpen onClose={vi.fn()} />)

    expect(screen.getByText("选择职业")).toBeInTheDocument()
    expect(screen.getByText("战士")).toBeInTheDocument()
    expect(screen.getByText("加粗")).toBeInTheDocument()
    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull()
  })
})
