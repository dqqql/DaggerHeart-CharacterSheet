import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CardMarkdown } from "@/components/ui/card-markdown"

describe("CardMarkdown", () => {
  it("drops raw html and dangerous protocols while preserving safe links", () => {
    const { container } = render(
      <CardMarkdown>
        {'<img src="x" onerror="alert(1)"> [危险链接](javascript:alert(1)) [安全链接](/safe-path)'}
      </CardMarkdown>,
    )

    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull()

    const safeLink = screen.getByRole("link", { name: "安全链接" })
    expect(safeLink).toHaveAttribute("href", "/safe-path")
  })
})
