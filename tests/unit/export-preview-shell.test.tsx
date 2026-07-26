import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ExportPreviewShell } from "@/components/print/export-preview-shell"

describe("ExportPreviewShell", () => {
  it("keeps the Daggerheart preview in its own light shell", () => {
    render(
      <ExportPreviewShell ruleSetId="daggerheart">
        <div>预览内容</div>
      </ExportPreviewShell>,
    )

    const shell = screen.getByText("预览内容").closest("main")
    expect(shell).toHaveAttribute("data-ruleset", "daggerheart")
    expect(shell).toHaveAttribute("data-export-preview-ruleset", "daggerheart")
    expect(shell).toHaveClass("export-preview-shell--daggerheart")
    expect(shell).not.toHaveClass("rhodes-island-shell")
  })

  it("keeps the Rhodes Island preview in the terminal shell", () => {
    render(
      <ExportPreviewShell ruleSetId="rhodes-island">
        <div>罗德岛预览内容</div>
      </ExportPreviewShell>,
    )

    const shell = screen.getByText("罗德岛预览内容").closest("main")
    expect(shell).toHaveAttribute("data-ruleset", "rhodes-island")
    expect(shell).toHaveAttribute("data-export-preview-ruleset", "rhodes-island")
    expect(shell).toHaveAttribute("data-ri-app", "terminal")
    expect(shell).toHaveClass("export-preview-shell--rhodes-island", "rhodes-island-shell")
  })
})
