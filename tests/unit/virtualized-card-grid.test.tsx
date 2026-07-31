import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CardType, type StandardCard } from "@/card/card-types"
import { VirtualizedCardGrid } from "@/components/modals/display/VirtualizedCardGrid"

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () => Array.from(
      { length: Math.min(count, 3) },
      (_, index) => ({
        index,
        key: `row-${index}`,
        start: index * 414,
      }),
    ),
    getTotalSize: () => count * 414,
    measureElement: () => {},
    scrollToIndex: () => {},
    scrollToOffset: () => {},
  }),
}))

const cards: StandardCard[] = Array.from({ length: 60 }, (_, index) => ({
  standarized: true,
  id: `card-${index}`,
  name: `卡牌 ${index}`,
  type: CardType.Domain,
  class: "奥术",
  description: `第 ${index} 张卡牌`,
  cardSelectDisplay: { item1: "奥术", item2: "LV.1" },
}))

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element) {
    this.callback(
      [{ target, contentRect: target.getBoundingClientRect() } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    )
  }

  unobserve() {}
  disconnect() {}
}

describe("VirtualizedCardGrid", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0)
      return 1
    })
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(900)
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(720)
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 900,
      height: 390,
      top: 0,
      left: 0,
      right: 900,
      bottom: 390,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
  })

  it("virtualizes responsive rows instead of mounting the entire card collection", async () => {
    render(
      <div id="card-scroll" style={{ height: 720, overflow: "auto" }}>
        <VirtualizedCardGrid
          cards={cards}
          isTextMode
          scrollableTarget="card-scroll"
        />
      </div>,
    )

    await act(async () => {})

    const grid = screen.getByTestId("virtual-grid")
    expect(grid).toHaveAttribute("data-column-count", "3")
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button").length).toBeLessThan(cards.length)
  })

  it("keeps keyboard selection and arrow navigation in the virtualized row", async () => {
    const onCardClick = vi.fn()
    render(
      <div id="card-scroll" style={{ height: 720, overflow: "auto" }}>
        <VirtualizedCardGrid
          cards={cards.slice(0, 6)}
          isTextMode
          onCardClick={onCardClick}
          scrollableTarget="card-scroll"
        />
      </div>,
    )

    await act(async () => {})

    const firstCard = screen.getByRole("button", { name: "选择卡牌：卡牌 0" })
    const nextCard = screen.getByRole("button", { name: "选择卡牌：卡牌 1" })
    firstCard.focus()
    fireEvent.keyDown(firstCard, { key: "ArrowRight" })
    expect(nextCard).toHaveFocus()

    fireEvent.keyDown(nextCard, { key: "Enter" })
    expect(onCardClick).toHaveBeenCalledWith(cards[1])
  })
})
