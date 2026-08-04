import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ArmorSelectionModal } from "@/components/modals/armor-selection-modal"

describe("ArmorSelectionModal", () => {
  it("wraps the long names and descriptions of the Rhodes armor sets", () => {
    render(
      <ArmorSelectionModal
        isOpen
        onClose={vi.fn()}
        onSelect={vi.fn()}
        title="选择护甲"
      />,
    )

    const table = screen.getByRole("table")
    expect(table).toHaveClass("table-fixed")

    const burningRow = screen.getByText("战意燃烧套装").closest("tr")
    const resistanceRow = screen.getByText("战线抵抗套装").closest("tr")

    expect(burningRow).not.toBeNull()
    expect(resistanceRow).not.toBeNull()
    expect(burningRow).toHaveTextContent("当你标记最后一个护甲槽时，你的伤害阈值提升+2")
    expect(resistanceRow).toHaveTextContent("当你成为攻击目标时，可以标记1护甲槽，使针对你的攻击掷骰具有劣势")
    expect(burningRow?.querySelector("td:last-child")).toHaveClass("break-words")
    expect(resistanceRow?.querySelector("td:last-child")).toHaveClass("break-words")
  })
})
