import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { NewExperienceEditor } from "@/components/upgrade-popover/new-experience-editor"

vi.mock("@/lib/sheet-store", () => ({
  useSheetStore: () => ({
    sheetData: {
      experience: ["", "", "", "", ""],
      experienceValues: ["", "", "", "", ""],
    },
    setSheetData: vi.fn(),
  }),
}))

vi.mock("@/components/ui/fade-notification", () => ({
  showFadeNotification: vi.fn(),
}))

describe("NewExperienceEditor contrast", () => {
  it("uses popover-aware labels and explicit high-contrast input colors", () => {
    render(<NewExperienceEditor />)

    expect(screen.getByText("添加新经历")).toHaveClass("text-popover-foreground")
    expect(screen.getByLabelText("经历内容")).toHaveClass("bg-white", "text-gray-900", "placeholder:text-gray-500")
    expect(screen.getByLabelText("经历加值")).toHaveClass("bg-white", "text-gray-900", "placeholder:text-gray-500")
    expect(screen.getByRole("button", { name: "关闭添加经历" })).toBeInTheDocument()
  })
})
