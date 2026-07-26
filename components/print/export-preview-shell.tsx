"use client"

import type { ReactNode } from "react"

import type { RuleSetId } from "@/lib/sheet-data"

interface ExportPreviewShellProps {
  ruleSetId: RuleSetId
  children: ReactNode
}

export function ExportPreviewShell({
  ruleSetId,
  children,
}: ExportPreviewShellProps) {
  const isRhodesIsland = ruleSetId === "rhodes-island"

  return (
    <main
      data-ruleset={ruleSetId}
      data-export-preview-ruleset={ruleSetId}
      data-ri-app={isRhodesIsland ? "terminal" : undefined}
      className={[
        "print-all-pages",
        "export-preview-shell",
        `export-preview-shell--${ruleSetId}`,
        isRhodesIsland ? "rhodes-island-shell" : "",
      ].filter(Boolean).join(" ")}
    >
      {children}
    </main>
  )
}
