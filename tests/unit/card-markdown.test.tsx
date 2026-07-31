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

  it("renders backslash-prefixed rules notes as annotations", () => {
    const { container } = render(
      <CardMarkdown>{"规则正文。\n\n\\这是一条规则补充。"}</CardMarkdown>,
    )

    expect(container.querySelector("blockquote")).toHaveTextContent("这是一条规则补充。")
    expect(container).not.toHaveTextContent("\\这是一条规则补充。")
  })

  it("keeps custom emphasis rendering stable", () => {
    const { container, rerender } = render(
      <CardMarkdown>{"**普通强调**、*规则词*、***重要规则***"}</CardMarkdown>,
    )

    expect(screen.getByText("普通强调")).toHaveClass("text-gray-800")
    expect(container.querySelector(".text-amber-900")).toHaveTextContent("「规则词」")
    expect(screen.getByText("重要规则")).toHaveClass("text-amber-800")

    const firstMarkup = container.innerHTML
    rerender(<CardMarkdown>{"**普通强调**、*规则词*、***重要规则***"}</CardMarkdown>)
    expect(container.innerHTML).toBe(firstMarkup)
  })
})
