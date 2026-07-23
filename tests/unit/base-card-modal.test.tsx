import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { BaseCardModal } from "@/components/modals/base/BaseCardModal"

describe("BaseCardModal", () => {
  it("portals above page stacking contexts and locks background scrolling", async () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <div data-testid="page-container">
        <BaseCardModal
          isOpen
          onClose={onClose}
          header={<div>选择卡牌</div>}
        >
          <div>卡牌内容</div>
        </BaseCardModal>
      </div>,
    )

    const dialog = screen.getByRole("dialog")
    expect(screen.getByTestId("page-container")).not.toContainElement(dialog)
    expect(dialog.closest("[data-modal-root]")).toHaveClass("z-[90]")
    expect(document.body.style.overflow).toBe("hidden")

    rerender(
      <div data-testid="page-container">
        <BaseCardModal
          isOpen={false}
          onClose={onClose}
          header={<div>选择卡牌</div>}
        >
          <div>卡牌内容</div>
        </BaseCardModal>
      </div>,
    )

    await waitFor(() => {
      expect(document.body.style.overflow).toBe("")
    })
  })
})
