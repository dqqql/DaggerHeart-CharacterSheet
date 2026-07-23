import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { UpgradeSection } from "@/components/character-sheet-page-two-sections/upgrade-section"
import { defaultSheetData } from "@/lib/default-sheet-data"

const setSheetData = vi.fn()

vi.mock("@/lib/sheet-store", () => ({
  useSheetStore: (selector: (state: unknown) => unknown) =>
    selector({
      updateLevel: vi.fn(),
      setSheetData,
    }),
}))

describe("UpgradeSection module layout", () => {
  it("places the Rhodes Island module option below the tier footer and a divider", () => {
    const moduleLabel = "获取模组：从当前分支的 X / Y 模组中单选一项。"

    render(
      <UpgradeSection
        tier={3}
        title="位阶4 等级 8-10"
        description="到达 8 级：选择模组。"
        formData={{ ...defaultSheetData, ruleSetId: "rhodes-island" }}
        isUpgradeChecked={() => false}
        handleUpgradeCheck={vi.fn()}
        toggleUpgradeCheckbox={vi.fn()}
        getUpgradeOptions={() => [
          { label: "获得闪避值+1。", doubleBox: false, boxCount: 1 },
          { label: moduleLabel, doubleBox: false, boxCount: 1 },
          { label: "(同时标记两格) 获得熟练值+1。", doubleBox: true, boxCount: 2 },
        ]}
      />,
    )

    const footer = screen.getByText(/将伤害阈值\+1，选择一张不高于你当前等级\(上限10级\)/)
    const moduleSection = screen.getByText(moduleLabel).closest("[data-module-upgrade-section]")

    expect(moduleSection).not.toBeNull()
    expect(moduleSection).toHaveClass("border-t-2", "border-cyan-700")
    expect(footer.compareDocumentPosition(moduleSection!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })
})
