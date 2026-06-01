import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import ProfessionDescriptionSection from "@/components/character-sheet-sections/profession-description-section"

describe("ProfessionDescriptionSection", () => {
  it("renders approved custom syntax without trusting raw html", () => {
    const description = [
      '普通段落 <img src="x" onerror="alert(1)">',
      "[checkbox:2] [input:4]",
      "[center]**居中标题**[/center]",
    ].join("\n")

    const { container } = render(<ProfessionDescriptionSection description={description} />)

    expect(container.querySelector("img")).toBeNull()
    expect(screen.getAllByRole("checkbox")).toHaveLength(2)
    expect(screen.getByRole("textbox")).toBeInTheDocument()

    const centeredBlock = container.querySelector(".text-center")
    expect(centeredBlock).not.toBeNull()
    expect(within(centeredBlock as HTMLElement).getByText("居中标题")).toBeInTheDocument()
  })
})
