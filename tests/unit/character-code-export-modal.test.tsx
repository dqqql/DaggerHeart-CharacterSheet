import { useState } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { BottomDock } from "@/components/layout/bottom-dock"
import { CharacterCodeExportModal } from "@/components/modals/character-code-export-modal"

function TestHarness() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <BottomDock
        mode="main"
        isMobile={false}
        isCardDrawerOpen={false}
        characterCount={1}
        onToggleCardDrawer={() => {}}
        onToggleGuide={() => {}}
        onToggleNotebook={() => {}}
        onPrintAll={() => {}}
        onOpenSealDiceExport={() => {}}
        onOpenCharacterCodeExport={() => setOpen(true)}
        onQuickExportJSON={() => {}}
        onQuickExportPDF={() => {}}
        onQuickExportHTML={() => {}}
        onOpenCharacterManagement={() => {}}
        onQuickCreateArchive={() => {}}
        onQuickImportFromHTML={() => {}}
      />
      <CharacterCodeExportModal
        isOpen={open}
        onClose={() => setOpen(false)}
        getCharacterCode={() => "dhc3_test_code"}
      />
    </>
  )
}

describe("character code export modal", () => {
  it("opens from the export menu and copies the code", async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText,
      },
    })

    render(<TestHarness />)

    await user.click(screen.getByTestId("export-menu-trigger"))
    fireEvent.click(await screen.findByTestId("export-character-code-item"))

    expect(await screen.findByTestId("character-code-modal-title")).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("character-code-copy-button"))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("dhc3_test_code")
    })
  })
})
