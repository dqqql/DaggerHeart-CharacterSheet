import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { BottomDock } from "@/components/layout/bottom-dock"

describe("Rhodes Island export menu", () => {
  it("only offers JSON, PDF, and HTML exports", async () => {
    const user = userEvent.setup()
    render(
      <BottomDock
        mode="main"
        ruleSetId="rhodes-island"
        isMobile={false}
        isCardDrawerOpen={false}
        characterCount={1}
        onToggleCardDrawer={() => {}}
        onToggleGuide={() => {}}
        onToggleNotebook={() => {}}
        onPrintAll={() => {}}
        onOpenSealDiceExport={() => {}}
        onOpenCharacterCodeExport={() => {}}
        onQuickExportJSON={() => {}}
        onQuickExportPDF={() => {}}
        onQuickExportHTML={() => {}}
        onOpenCharacterManagement={() => {}}
        onQuickCreateArchive={() => {}}
        onQuickImportFromJSON={() => {}}
        onQuickImportFromHTML={() => {}}
      />,
    )

    await user.click(screen.getByTestId("export-menu-trigger"))

    expect(await screen.findByText("导出 JSON")).toBeInTheDocument()
    expect(screen.getByText("导出 PDF")).toBeInTheDocument()
    expect(screen.getByText("导出 HTML")).toBeInTheDocument()
    expect(screen.queryByText("导出角色码")).not.toBeInTheDocument()
    expect(screen.queryByText("导出到骰子")).not.toBeInTheDocument()
    expect(screen.queryByText("打开导出预览界面")).not.toBeInTheDocument()
  })

  it("offers quick JSON import from the archive menu", async () => {
    const user = userEvent.setup()
    const onQuickImportFromJSON = vi.fn()

    render(
      <BottomDock
        mode="main"
        ruleSetId="rhodes-island"
        isMobile={false}
        isCardDrawerOpen={false}
        characterCount={1}
        onToggleCardDrawer={() => {}}
        onToggleGuide={() => {}}
        onToggleNotebook={() => {}}
        onPrintAll={() => {}}
        onOpenSealDiceExport={() => {}}
        onOpenCharacterCodeExport={() => {}}
        onQuickExportJSON={() => {}}
        onQuickExportPDF={() => {}}
        onQuickExportHTML={() => {}}
        onOpenCharacterManagement={() => {}}
        onQuickCreateArchive={() => {}}
        onQuickImportFromJSON={onQuickImportFromJSON}
        onQuickImportFromHTML={() => {}}
      />,
    )

    await user.click(screen.getByTestId("archive-menu-trigger"))
    await user.click(await screen.findByTestId("import-json-archive-item"))

    expect(onQuickImportFromJSON).toHaveBeenCalledTimes(1)
  })
})
