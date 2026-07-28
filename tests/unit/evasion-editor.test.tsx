import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { EvasionEditor } from "@/components/upgrade-popover/evasion-editor"

const sheetState = {
  sheetData: {},
  setSheetData: vi.fn(),
  createEvasionSnapshot: vi.fn(),
}

vi.mock("@/lib/sheet-store", () => ({
  useSheetStore: (selector?: (state: typeof sheetState) => unknown) =>
    selector ? selector(sheetState) : sheetState,
}))

vi.mock("@/lib/domain-card-derived-stats", () => ({
  calculateEvasionBreakdown: () => ({ display: "11" }),
  convertDisplayedEvasionToManualModifier: () => "1",
}))

vi.mock("@/components/ui/fade-notification", () => ({
  showFadeNotification: vi.fn(),
}))

describe("EvasionEditor contrast", () => {
  it("uses popover-aware chrome and an explicit high-contrast value field", () => {
    render(
      <EvasionEditor
        checkKey="tier1-5-0"
        optionIndex={5}
        toggleUpgradeCheckbox={vi.fn()}
      />,
    )

    expect(screen.getByText("闪避值 +1")).toHaveClass("text-popover-foreground")
    expect(screen.getByLabelText("闪避值")).toHaveClass(
      "bg-white",
      "text-gray-900",
      "placeholder:text-gray-500",
    )
    expect(screen.getByLabelText("闪避值")).toHaveValue("11")
    expect(screen.getByRole("button", { name: "关闭闪避值编辑器" })).toBeInTheDocument()
  })
})
