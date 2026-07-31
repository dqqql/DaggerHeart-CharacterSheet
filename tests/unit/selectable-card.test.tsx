import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { CardSource, CardType, type ExtendedStandardCard } from "@/card/card-types"
import { SelectableCard } from "@/components/ui/selectable-card"

const card: ExtendedStandardCard = {
  standarized: true,
  id: "card-1",
  name: "测试卡牌",
  type: CardType.Domain,
  class: "奥术",
  description: "卡牌描述",
  cardSelectDisplay: { item1: "奥术", item2: "LV.1" },
  source: CardSource.BUILTIN,
}

describe("SelectableCard", () => {
  it("derives source synchronously without registering per-card global keyboard listeners", () => {
    const addEventListener = vi.spyOn(window, "addEventListener")

    render(
      <>
        <SelectableCard card={card} onClick={() => {}} isSelected={false} />
        <SelectableCard card={{ ...card, id: "card-2" }} onClick={() => {}} isSelected={false} />
      </>,
    )

    expect(screen.getAllByText("内置卡包")).toHaveLength(2)
    expect(addEventListener.mock.calls.filter(([eventName]) => eventName === "keydown")).toHaveLength(0)
    expect(addEventListener.mock.calls.filter(([eventName]) => eventName === "keyup")).toHaveLength(0)
  })

  it("supports keyboard selection and exposes selected state", () => {
    const onSelectCard = vi.fn()
    render(
      <SelectableCard
        card={card}
        onSelectCard={onSelectCard}
        isSelected
      />,
    )

    const button = screen.getByRole("button", { name: "选择卡牌：测试卡牌" })
    expect(button).toHaveAttribute("aria-pressed", "true")

    fireEvent.keyDown(button, { key: "Enter" })
    fireEvent.keyDown(button, { key: " " })
    expect(onSelectCard).toHaveBeenCalledTimes(2)
    expect(onSelectCard).toHaveBeenLastCalledWith(card)
  })
})
