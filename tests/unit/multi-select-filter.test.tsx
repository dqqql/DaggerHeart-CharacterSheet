import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { MultiSelectFilter } from "@/components/modals/filters/MultiSelectFilter"

describe("MultiSelectFilter", () => {
  it("renders its portalled menu above card modals", async () => {
    const user = userEvent.setup()

    render(
      <MultiSelectFilter
        label="卡包"
        options={[{ value: "builtin", label: "内置卡牌包" }]}
        selected={[]}
        onChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: "卡包: 未选" }))

    expect(screen.getByRole("menu")).toHaveClass("z-[100]")
  })
})
