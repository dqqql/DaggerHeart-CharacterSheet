import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { RhodesMulticlassModal } from "@/components/modals/rhodes-multiclass-modal"
import { rhodesIslandCatalog } from "@/data/rhodes-island"

describe("RhodesMulticlassModal", () => {
  it("uses a readable light theme and enables branch selection after choosing a profession", async () => {
    const user = userEvent.setup()
    const mainProfession = rhodesIslandCatalog.professions[0]
    const extraProfession = rhodesIslandCatalog.professions[1]
    const branch = rhodesIslandCatalog.branches.find(item => item.professionId === extraProfession.id)!

    render(
      <RhodesMulticlassModal
        open
        mainProfessionId={mainProfession.id}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    const dialog = screen.getByRole("dialog")
    const professionSelect = screen.getByLabelText("额外职业")
    const branchSelect = screen.getByLabelText("初始分支")

    expect(dialog).toHaveAttribute("data-rhodes-multiclass-modal")
    expect(professionSelect).toHaveClass("bg-white", "text-slate-800")
    expect(branchSelect).toBeDisabled()

    await user.selectOptions(professionSelect, extraProfession.id)

    expect(branchSelect).not.toBeDisabled()
    expect(branchSelect).toHaveClass("bg-white", "text-slate-800")
    expect(screen.getByRole("option", { name: branch.name })).toBeVisible()
  })
})
